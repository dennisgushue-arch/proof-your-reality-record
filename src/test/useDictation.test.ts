import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDictation } from "@/hooks/useDictation";

type MockRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

const originalSpeechRecognition = (window as any).SpeechRecognition;
const originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition;

function clearRecognitionConstructors() {
  (window as any).SpeechRecognition = undefined;
  (window as any).webkitSpeechRecognition = undefined;
}

afterEach(() => {
  (window as any).SpeechRecognition = originalSpeechRecognition;
  (window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
  vi.restoreAllMocks();
});

describe("useDictation", () => {
  it("reports unsupported browsers through the error callback", () => {
    clearRecognitionConstructors();

    const onError = vi.fn();
    const onTranscript = vi.fn();

    const { result } = renderHook(() => useDictation({ onTranscript, onError }));

    expect(result.current.isSupported).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(onError).toHaveBeenCalledWith("Speech dictation is not supported in this browser.");
    expect(result.current.isDictating).toBe(false);
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("starts and stops recognition when toggled", () => {
    const instances: MockRecognition[] = [];

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult = null;
      onerror = null;
      onend = null;
      start = vi.fn();
      stop = vi.fn();

      constructor() {
        instances.push(this as unknown as MockRecognition);
      }
    }

    (window as any).webkitSpeechRecognition = MockSpeechRecognition;

    const onTranscript = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useDictation({
        onTranscript,
        onError,
        initialLanguage: "en-GB",
      })
    );

    expect(result.current.isSupported).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(instances).toHaveLength(1);
    expect(instances[0].lang).toBe("en-GB");
    expect(instances[0].continuous).toBe(true);
    expect(instances[0].interimResults).toBe(true);
    expect(instances[0].start).toHaveBeenCalledTimes(1);
    expect(result.current.isDictating).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(instances[0].stop).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("forwards only final transcript chunks from recognition results", () => {
    const instances: MockRecognition[] = [];

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult = null;
      onerror = null;
      onend = null;
      start = vi.fn();
      stop = vi.fn();

      constructor() {
        instances.push(this as unknown as MockRecognition);
      }
    }

    (window as any).webkitSpeechRecognition = MockSpeechRecognition;

    const onTranscript = vi.fn();

    const { result } = renderHook(() =>
      useDictation({
        onTranscript,
      })
    );

    act(() => {
      result.current.toggle();
    });

    act(() => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: "first chunk (interim)" }], { isFinal: false }),
          Object.assign([{ transcript: "first chunk" }], { isFinal: true }),
          Object.assign([{ transcript: "second chunk" }], { isFinal: true }),
        ],
      });
    });

    expect(onTranscript).toHaveBeenNthCalledWith(1, "first chunk");
    expect(onTranscript).toHaveBeenNthCalledWith(2, "second chunk");
  });

  it("suppresses duplicate final transcript chunks", () => {
    const instances: MockRecognition[] = [];

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult = null;
      onerror = null;
      onend = null;
      start = vi.fn();
      stop = vi.fn();

      constructor() {
        instances.push(this as unknown as MockRecognition);
      }
    }

    (window as any).webkitSpeechRecognition = MockSpeechRecognition;

    const onTranscript = vi.fn();

    const { result } = renderHook(() =>
      useDictation({
        onTranscript,
      })
    );

    act(() => {
      result.current.toggle();
    });

    act(() => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: "same final text" }], { isFinal: true }),
        ],
      });
    });

    act(() => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: "same final text" }], { isFinal: true }),
        ],
      });
    });

    act(() => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: "different final text" }], { isFinal: true }),
        ],
      });
    });

    expect(onTranscript).toHaveBeenCalledTimes(2);
    expect(onTranscript).toHaveBeenNthCalledWith(1, "same final text");
    expect(onTranscript).toHaveBeenNthCalledWith(2, "different final text");
  });

  it("restarts recognition on end while dictation should continue", () => {
    const instances: MockRecognition[] = [];

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult = null;
      onerror = null;
      onend = null;
      start = vi.fn();
      stop = vi.fn();

      constructor() {
        instances.push(this as unknown as MockRecognition);
      }
    }

    (window as any).webkitSpeechRecognition = MockSpeechRecognition;

    const { result } = renderHook(() =>
      useDictation({
        onTranscript: vi.fn(),
      })
    );

    act(() => {
      result.current.toggle();
    });

    expect(instances[0].start).toHaveBeenCalledTimes(1);

    act(() => {
      instances[0].onend?.();
    });

    expect(instances[0].start).toHaveBeenCalledTimes(2);
    expect(result.current.isDictating).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(instances[0].stop).toHaveBeenCalledTimes(1);
    expect(result.current.isDictating).toBe(false);
  });
});
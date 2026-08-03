import { useEffect, useRef, useState } from "react";

type AudioRecorderOptions = {
  onRecordingComplete: (file: File) => void;
  onError?: (message: string) => void;
};

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function extensionForMimeType(mimeType: string) {
  return mimeType.includes("mp4") ? "m4a" : "webm";
}

export function useAudioRecorder({ onRecordingComplete, onError }: AudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mountedRef = useRef(true);
  const onCompleteRef = useRef(onRecordingComplete);
  const onErrorRef = useRef(onError);

  onCompleteRef.current = onRecordingComplete;
  onErrorRef.current = onError;

  const isSupported =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined";

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stop = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
      return;
    }
    releaseStream();
    setIsRecording(false);
  };

  const start = async () => {
    if (recorderRef.current?.state === "recording") return;
    if (!isSupported) {
      onErrorRef.current?.("Audio recording is not supported in this browser. Use Type mode to capture the incident.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const startedAt = new Date();

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        recorderRef.current = null;
        chunksRef.current = [];
        releaseStream();
        if (mountedRef.current) {
          setIsRecording(false);
          onErrorRef.current?.("Audio recording stopped unexpectedly. Please try again.");
        }
      };
      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalType });
        recorderRef.current = null;
        chunksRef.current = [];
        releaseStream();
        if (mountedRef.current) setIsRecording(false);

        if (!mountedRef.current) return;
        if (blob.size === 0) {
          onErrorRef.current?.("No audio was captured. Check microphone access and try again.");
          return;
        }

        const timestamp = startedAt.toISOString().replace(/[:.]/g, "-");
        onCompleteRef.current(new File([blob], `voice-recording-${timestamp}.${extensionForMimeType(finalType)}`, { type: finalType }));
      };

      recorder.start(250);
      setIsRecording(true);
    } catch (error) {
      releaseStream();
      recorderRef.current = null;
      setIsRecording(false);
      const permissionBlocked = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      onErrorRef.current?.(
        permissionBlocked
          ? "Microphone permission is blocked. Allow microphone access and try again."
          : "Could not start audio recording. Check microphone access and try again.",
      );
    }
  };

  const toggle = () => {
    if (isRecording) {
      stop();
      return;
    }
    void start();
  };

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder?.state === "recording") recorder.stop();
      releaseStream();
    };
  }, []);

  return { isSupported, isRecording, toggle, stop };
}

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: { transcript?: string };
  }>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type DictationOptions = {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  initialLanguage?: string;
};

function getStartErrorMessage(error: unknown) {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return "Microphone permission is blocked. Please allow mic access and try again.";
  }
  return "Voice dictation could not start. Check microphone access and try again.";
}

export const DICTATION_LANGUAGES = [
  { label: "English (US)", value: "en-US" },
  { label: "English (UK)", value: "en-GB" },
  { label: "Spanish", value: "es-ES" },
  { label: "French", value: "fr-FR" },
  { label: "German", value: "de-DE" },
  { label: "Italian", value: "it-IT" },
  { label: "Portuguese (BR)", value: "pt-BR" },
  { label: "Hindi", value: "hi-IN" },
] as const;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useDictation(options: DictationOptions) {
  const { onTranscript, onError, initialLanguage = "en-US" } = options;

  const [isDictating, setIsDictating] = useState(false);
  const [language, setLanguage] = useState(initialLanguage);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldContinueRef = useRef(false);
  const lastFinalTranscriptRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  const isSupported = Boolean(getSpeechRecognitionCtor());

  const stop = () => {
    shouldContinueRef.current = false;
    lastFinalTranscriptRef.current = "";
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setIsDictating(false);
    recognition?.stop();
  };

  const start = () => {
    if (recognitionRef.current) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.("Speech dictation is not supported in this browser.");
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    lastFinalTranscriptRef.current = "";

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result?.isFinal) continue;
        const transcript = result?.[0]?.transcript?.trim?.() ?? "";
        if (!transcript) continue;

        const normalizedTranscript = transcript.toLowerCase();
        if (normalizedTranscript === lastFinalTranscriptRef.current) continue;

        lastFinalTranscriptRef.current = normalizedTranscript;
        onTranscriptRef.current(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;

      const code = typeof event?.error === "string" ? event.error : "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        shouldContinueRef.current = false;
        setIsDictating(false);
        recognitionRef.current = null;
        onErrorRef.current?.("Microphone permission is blocked. Please allow mic access and try again.");
        return;
      }

      if (code === "aborted") return;

      if (code === "audio-capture") {
        shouldContinueRef.current = false;
        setIsDictating(false);
        recognitionRef.current = null;
        onErrorRef.current?.("No microphone was available. Check microphone access and try again.");
        return;
      }

      if (code === "network" || code === "language-not-supported") {
        shouldContinueRef.current = false;
        setIsDictating(false);
        recognitionRef.current = null;
        onErrorRef.current?.(
          code === "network"
            ? "Dictation could not reach the speech service. Check your connection and try again."
            : "The selected dictation language is not supported on this device.",
        );
        return;
      }

      if (code !== "no-speech") {
        shouldContinueRef.current = false;
        setIsDictating(false);
        recognitionRef.current = null;
        onErrorRef.current?.("Could not continue dictation. Please try again.");
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;

      if (shouldContinueRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          shouldContinueRef.current = false;
          onErrorRef.current?.("Could not continue dictation. Please try again.");
        }
      }

      setIsDictating(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    shouldContinueRef.current = true;

    try {
      recognition.start();
      setIsDictating(true);
    } catch (error) {
      shouldContinueRef.current = false;
      recognitionRef.current = null;
      setIsDictating(false);
      onErrorRef.current?.(getStartErrorMessage(error));
    }
  };

  const toggle = () => {
    if (shouldContinueRef.current || recognitionRef.current) {
      stop();
      return;
    }
    start();
  };

  useEffect(() => {
    return () => {
      shouldContinueRef.current = false;
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition?.stop();
    };
  }, []);

  return {
    isSupported,
    isDictating,
    language,
    setLanguage,
    toggle,
    stop,
  };
}

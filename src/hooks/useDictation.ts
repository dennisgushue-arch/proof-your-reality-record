import { useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
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

  const isSupported = Boolean(getSpeechRecognitionCtor());

  const stop = () => {
    shouldContinueRef.current = false;
    lastFinalTranscriptRef.current = "";
    recognitionRef.current?.stop();
    setIsDictating(false);
  };

  const start = () => {
    if (recognitionRef.current) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onError?.("Speech dictation is not supported in this browser.");
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    lastFinalTranscriptRef.current = "";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result?.isFinal) continue;
        const transcript = result?.[0]?.transcript?.trim?.() ?? "";
        if (!transcript) continue;

        const normalizedTranscript = transcript.toLowerCase();
        if (normalizedTranscript === lastFinalTranscriptRef.current) continue;

        lastFinalTranscriptRef.current = normalizedTranscript;
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      const code = event?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        shouldContinueRef.current = false;
        setIsDictating(false);
        recognitionRef.current = null;
        onError?.("Microphone permission is blocked. Please allow mic access and try again.");
        return;
      }

      onError?.("Could not continue dictation.");
    };

    recognition.onend = () => {
      if (shouldContinueRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          onError?.("Could not continue dictation.");
        }
      }

      setIsDictating(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    shouldContinueRef.current = true;
    setIsDictating(true);
    recognition.start();
  };

  const toggle = () => {
    if (isDictating) {
      stop();
      return;
    }
    start();
  };

  useEffect(() => {
    return () => {
      shouldContinueRef.current = false;
      recognitionRef.current?.stop();
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

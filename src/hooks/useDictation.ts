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

  const isSupported = Boolean(getSpeechRecognitionCtor());

  const stop = () => {
    recognitionRef.current?.stop();
  };

  const start = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onError?.("Speech dictation is not supported in this browser.");
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result: any) => result?.[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) onTranscript(transcript);
    };

    recognition.onerror = () => {
      onError?.("Could not continue dictation.");
    };

    recognition.onend = () => {
      setIsDictating(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
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

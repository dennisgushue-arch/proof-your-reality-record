type HapticPreset = "light" | "success" | "alert";
type TonePreset = "intelligence" | "success" | "alert" | "click";

const toneMap: Record<TonePreset, { frequency: number; duration: number; gain: number; type: OscillatorType }> = {
  intelligence: { frequency: 660, duration: 0.07, gain: 0.03, type: "sine" },
  success: { frequency: 540, duration: 0.08, gain: 0.035, type: "triangle" },
  alert: { frequency: 380, duration: 0.1, gain: 0.04, type: "sawtooth" },
  click: { frequency: 720, duration: 0.04, gain: 0.025, type: "square" },
};

export function triggerHaptic(preset: HapticPreset) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;

  if (preset === "light") navigator.vibrate(8);
  if (preset === "success") navigator.vibrate([12, 20, 12]);
  if (preset === "alert") navigator.vibrate([20, 35, 30]);
}

export function playUiTone(preset: TonePreset) {
  if (typeof window === "undefined") return;

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const config = toneMap[preset];

  try {
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = config.type;
    oscillator.frequency.value = config.frequency;

    gainNode.gain.value = 0;
    gainNode.gain.linearRampToValueAtTime(config.gain, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + config.duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + config.duration + 0.02);

    oscillator.onended = () => {
      void context.close();
    };
  } catch {
    // Non-blocking progressive enhancement.
  }
}

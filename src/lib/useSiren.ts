import { useRef, useCallback, useEffect } from "react";

export function useSiren() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const play = useCallback(() => {
    if (intervalRef.current) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.3;
    gainRef.current = gain;

    let ascending = true;
    let freq = 600;

    const oscillator = ctx.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = freq;
    oscillator.connect(gain);
    oscillator.start();
    oscillatorRef.current = oscillator;

    intervalRef.current = setInterval(() => {
      if (ascending) {
        freq += 40;
        if (freq >= 1200) ascending = false;
      } else {
        freq -= 40;
        if (freq <= 600) ascending = true;
      }
      if (oscillatorRef.current) {
        oscillatorRef.current.frequency.setValueAtTime(freq, ctx.currentTime);
      }
    }, 50);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch {
        // Already stopped
      }
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { play, stop };
}

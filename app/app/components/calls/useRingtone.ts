"use client";

import { useCallback, useRef } from "react";

export function useRingtone() {
  const ringtoneContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const ringtoneTimeoutRef = useRef<number | null>(null);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }

    if (ringtoneTimeoutRef.current) {
      window.clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }

    ringtoneContextRef.current?.close().catch(() => undefined);
    ringtoneContextRef.current = null;
  }, []);

  const startRingtone = useCallback(() => {
    if (typeof window === "undefined" || ringtoneContextRef.current) {
      return;
    }

    const AudioContextCtor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    ringtoneContextRef.current = audioContext;

    const playBurst = () => {
      const now = audioContext.currentTime;
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.connect(audioContext.destination);

      [880, 660].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.connect(gainNode);

        const startAt = now + index * 0.35;
        oscillator.start(startAt);
        gainNode.gain.setValueAtTime(0.0001, startAt);
        gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22);
        oscillator.stop(startAt + 0.24);
      });
    };

    void audioContext.resume().then(() => {
      playBurst();
      ringtoneIntervalRef.current = window.setInterval(playBurst, 1700);
    }).catch(() => {
      stopRingtone();
    });
  }, [stopRingtone]);

  return { startRingtone, stopRingtone };
}


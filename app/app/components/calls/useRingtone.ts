"use client";

import { useCallback, useEffect, useRef } from "react";

export function useRingtone() {
  const ringtoneContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const ringtoneTimeoutRef = useRef<number | null>(null);
  const isUnlockedRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    if (ringtoneContextRef.current) {
      return ringtoneContextRef.current;
    }

    const AudioContextCtor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    const audioContext = new AudioContextCtor();
    ringtoneContextRef.current = audioContext;
    return audioContext;
  }, []);

  const stopRingtone = useCallback((closeContext = false) => {
    if (ringtoneIntervalRef.current) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }

    if (ringtoneTimeoutRef.current) {
      window.clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(0);
    }

    if (closeContext) {
      ringtoneContextRef.current?.close().catch(() => undefined);
      ringtoneContextRef.current = null;
      isUnlockedRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isUnlockedRef.current) {
      return;
    }

    const unlockAudio = () => {
      const audioContext = getAudioContext();
      if (!audioContext) return;

      void audioContext.resume().then(() => {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.0001;
        source.buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
        isUnlockedRef.current = true;
      }).catch(() => undefined);
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    window.addEventListener("touchstart", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, [getAudioContext]);

  const startRingtone = useCallback(() => {
    if (typeof window === "undefined" || ringtoneIntervalRef.current) {
      return;
    }

    const audioContext = getAudioContext();
    if (!audioContext) {
      return;
    }

    const playBurst = () => {
      const now = audioContext.currentTime;
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.connect(audioContext.destination);

      [880, 660].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.connect(gainNode);

        const startAt = now + index * 0.35;
        oscillator.start(startAt);
        gainNode.gain.setValueAtTime(0.0001, startAt);
        gainNode.gain.exponentialRampToValueAtTime(0.16, startAt + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.32);
        oscillator.stop(startAt + 0.34);
      });

      if ("vibrate" in navigator) {
        navigator.vibrate([220, 120, 220]);
      }
    };

    void audioContext.resume().then(() => {
      playBurst();
      ringtoneIntervalRef.current = window.setInterval(playBurst, 1700);
    }).catch(() => {
      stopRingtone();
    });
  }, [getAudioContext, stopRingtone]);

  useEffect(() => () => stopRingtone(true), [stopRingtone]);

  return { startRingtone, stopRingtone };
}

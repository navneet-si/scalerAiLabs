"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useMediaSync(durationMs: number, audioUrl: string | null) {
  const [playing, setPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Virtual clock state
  const virtualTimeRef = useRef(0);
  const lastTickTimeRef = useRef(0);

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      const handleTimeUpdate = () => setCurrentTimeMs(audio.currentTime * 1000);
      const handlePlay = () => setPlaying(true);
      const handlePause = () => setPlaying(false);
      const handleEnded = () => setPlaying(false);
      
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("ended", handleEnded);
      
      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("ended", handleEnded);
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const play = useCallback(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(console.error);
    } else {
      // Playing from the very end restarts, rather than ending again on the next
      // tick. Without this the virtual clock is a one-shot: it stops at
      // durationMs and every later play() immediately re-triggers the end.
      if (virtualTimeRef.current >= durationMs) {
        virtualTimeRef.current = 0;
        setCurrentTimeMs(0);
      }
      setPlaying(true);
      lastTickTimeRef.current = performance.now();
    }
  }, [audioUrl, durationMs]);

  const pause = useCallback(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.pause();
    } else {
      setPlaying(false);
    }
  }, [audioUrl]);

  const seek = useCallback((ms: number) => {
    const safeMs = Math.max(0, Math.min(ms, durationMs));
    setCurrentTimeMs(safeMs);
    
    if (audioUrl && audioRef.current) {
      audioRef.current.currentTime = safeMs / 1000;
    } else {
      virtualTimeRef.current = safeMs;
      if (playing) {
        lastTickTimeRef.current = performance.now();
      }
    }
  }, [audioUrl, durationMs, playing]);

  // Virtual clock loop
  useEffect(() => {
    if (audioUrl || !playing) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = (now: number) => {
      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;
      
      virtualTimeRef.current += (delta * playbackRate);
      
      if (virtualTimeRef.current >= durationMs) {
        virtualTimeRef.current = durationMs;
        setCurrentTimeMs(durationMs);
        setPlaying(false);
      } else {
        setCurrentTimeMs(virtualTimeRef.current);
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    
    lastTickTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [playing, audioUrl, durationMs, playbackRate]);

  return {
    currentTimeMs,
    playing,
    play,
    pause,
    seek,
    rate: playbackRate,
    setRate: setPlaybackRate,
  };
}

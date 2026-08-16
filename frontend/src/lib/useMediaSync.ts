"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useMediaSync synchronizes the transcript UI with an audio player.
 * 
 * In a real product, meetings might lack audio files (e.g., imported text only, or audio is still processing).
 * This hook handles both scenarios gracefully:
 * 1. If an audioUrl is provided, it mounts a standard HTML5 `<audio>` element and binds to its `timeupdate` events.
 * 2. If no audioUrl is provided, it simulates playback using a Virtual Clock driven by `requestAnimationFrame`.
 * 
 * @param durationMs - The total duration of the meeting in milliseconds, supplied by the backend.
 * @param audioUrl - Optional URL to the audio file.
 */
export function useMediaSync(durationMs: number, audioUrl: string | null) {
  const [playing, setPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Virtual clock state variables used when audioUrl is null.
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

  // Virtual clock loop: When no audio is present, simulate playback progress using requestAnimationFrame
  useEffect(() => {
    if (audioUrl || !playing) {
      // If we have real audio or are paused, clear any running virtual clock frames.
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = (now: number) => {
      // Calculate how much time passed since the last frame
      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;
      
      // Advance virtual time, accounting for custom playback speeds (e.g. 1.5x)
      virtualTimeRef.current += (delta * playbackRate);
      
      if (virtualTimeRef.current >= durationMs) {
        // Stop playback once we hit the known duration
        virtualTimeRef.current = durationMs;
        setCurrentTimeMs(durationMs);
        setPlaying(false);
      } else {
        // Update the current time and request the next frame
        setCurrentTimeMs(virtualTimeRef.current);
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    
    // Initialize the clock
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

// Format milliseconds into MM:SS or H:MM:SS
export function formatMs(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  const mStr = m.toString().padStart(2, "0");
  const sStr = s.toString().padStart(2, "0");
  
  if (h > 0) {
    return `${h}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

// Convert ms to minutes integer
export function formatMsToMinutes(ms: number): number {
  if (ms < 0) return 0;
  return Math.floor(ms / (1000 * 60));
}

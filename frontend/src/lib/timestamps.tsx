// Turns "(03:26)" written inside summary prose into a clickable seek control.
//
// The summariser emits these inline rather than as structured fields, so the
// notes-to-player half of the bidirectional sync depends on parsing them back
// out of the text at render time.
import React from "react";

// (mm:ss) or (h:mm:ss), parenthesised — the only form the summariser produces.
const TIMESTAMP = /\((\d{1,2}):([0-5]\d)(?::([0-5]\d))?\)/g;

export function parseTimestampMs(match: RegExpExecArray): number {
  const [, a, b, c] = match;
  // Three capture groups means h:mm:ss; two means mm:ss.
  const hours = c ? Number(a) : 0;
  const minutes = c ? Number(b) : Number(a);
  const seconds = c ? Number(c) : Number(b);
  return ((hours * 3600) + (minutes * 60) + seconds) * 1000;
}

/**
 * Renders text with every inline timestamp replaced by a seek button.
 * Returns a fragment so it can drop into a <p> or <li> unchanged.
 */
export function withTimestamps(text: string, onSeek: (ms: number) => void): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  // A fresh regex per call — the /g lastIndex is stateful and would otherwise
  // leak between renders.
  const re = new RegExp(TIMESTAMP.source, "g");

  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    const ms = parseTimestampMs(match);
    const label = match[0].slice(1, -1);
    nodes.push(
      <button
        key={`${match.index}-${label}`}
        type="button"
        onClick={() => onSeek(ms)}
        className="text-[var(--color-blue-700)] hover:underline outline-none"
      >
        ({label})
      </button>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor === 0) return text;
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

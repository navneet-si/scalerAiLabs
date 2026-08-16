import { SegmentRead } from "./types";

export type Sentence = {
  id: string; // unique key, e.g. segmentId-sentenceIndex
  segment_id: number;
  text: string;
  start_ms: number;
  end_ms: number;
  speaker_id: number | null;
};

export type SentenceSegment = {
  segment: SegmentRead;
  sentences: Sentence[];
};

/**
 * Splits a list of transcript segments into individual sentences.
 * 
 * This is crucial for rendering granular highlights during playback.
 * A naive `.split('.')` would over-split on abbreviations (e.g. Mr., e.g.) and decimals (e.g. 3.14).
 * This function iterates character-by-character to accurately identify true sentence boundaries
 * by checking context (e.g., ensuring a period is followed by a space) and avoiding known abbreviations.
 * 
 * @param segments - The raw transcript segments from the backend.
 * @returns An array of objects pairing each segment with its parsed sentences.
 */
export function splitSentences(segments: SegmentRead[]): SentenceSegment[] {
  return segments.map((segment) => {
    // Regex for sentence splitting, attempting to avoid abbreviations and decimals
    // Split on . ? ! followed by a space and an uppercase letter, or at the end of the string.
    // Also handling things like "Mr. Smith" or "e.g. this".
    
    // A simplified but robust approach:
    // Look for punctuation (. ? !) followed by a space or end of string.
    // Negative lookbehind for common abbreviations (limited in JS, so we'll do manual pass).
    
    const text = segment.text;
    const tokens: string[] = [];
    
    let current = "";
    for (let i = 0; i < text.length; i++) {
      current += text[i];
      if (['.', '?', '!'].includes(text[i])) {
        // Check if next char is space or end
        const nextChar = text[i + 1];
        if (nextChar === ' ' || nextChar === undefined) {
          // Check for abbreviations
          const isMr = current.match(/\b(Mr|Mrs|Ms|Dr|Prof|e\.g|i\.e|vs)\.$/i);
          // Check for decimals (if dot is followed by a number, but wait, we already checked for space/undefined)
          if (!isMr) {
            // It's a boundary
            // capture the space if it exists
            if (nextChar === ' ') {
              current += ' ';
              i++; // skip the space
            }
            tokens.push(current);
            current = "";
          }
        }
      }
    }
    if (current.trim().length > 0) {
      tokens.push(current);
    }
    
    // If splitting failed completely, just return the whole segment as one sentence.
    const sentencesText = tokens.length > 0 ? tokens : [text];
    
    const duration_ms = segment.end_ms - segment.start_ms;
    const totalChars = sentencesText.reduce((acc, val) => acc + val.length, 0);
    
    let currentStartMs = segment.start_ms;
    
    const sentences = sentencesText.map((s, idx) => {
      const charCount = s.length;
      const proportion = totalChars > 0 ? charCount / totalChars : 0;
      const sentenceDuration = Math.round(duration_ms * proportion);
      const sentenceStartMs = currentStartMs;
      const sentenceEndMs = currentStartMs + sentenceDuration;
      
      currentStartMs = sentenceEndMs;
      
      return {
        id: `${segment.id}-${idx}`,
        segment_id: segment.id,
        text: s.trim(), // trim spaces for rendering
        start_ms: sentenceStartMs,
        end_ms: sentenceEndMs,
        speaker_id: segment.speaker_id,
      };
    });

    return {
      segment,
      sentences
    };
  });
}

// Flat list for binary search
export function flattenSentences(sentenceSegments: SentenceSegment[]): Sentence[] {
  return sentenceSegments.flatMap(s => s.sentences);
}

/**
 * Uses binary search to instantly find the currently active sentence for a given playback timestamp.
 * 
 * In a long meeting, finding the active sentence iteratively (O(N)) on every clock tick (60 FPS) 
 * would cause significant UI lag. This function operates in O(log N) time.
 * The "active sentence" is defined as the *last* sentence whose `start_ms` is less than or equal 
 * to the `currentTimeMs`.
 * 
 * @param sentences - A flattened, chronologically sorted array of all sentences.
 * @param currentTimeMs - The current audio playback time in milliseconds.
 * @returns The index of the active sentence, or -1 if no sentence is active yet.
 */
export function findActiveSentenceIndex(sentences: Sentence[], currentTimeMs: number): number {
  if (sentences.length === 0) return -1;
  if (currentTimeMs < sentences[0].start_ms) return -1;
  
  let left = 0;
  let right = sentences.length - 1;
  let ans = -1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (sentences[mid].start_ms <= currentTimeMs) {
      ans = mid;
      left = mid + 1; // Try to find a later sentence
    } else {
      right = mid - 1;
    }
  }
  
  return ans;
}

/**
 * Audio Timestamp System for Narayaneeyam
 *
 * Timestamps are stored per dashakam and define:
 * 1. Line-level timestamps (phraseEndTimes) — used in Learn module for silence gaps
 * 2. Verse-level timestamps (verseEndTimes) — used in Chant/Learn for lyric highlighting
 *
 * Audio naming: /public/audio/SL{DDD}-{VV}.m4a  (per-verse files)
 *               /public/audio/SL{DDD}.m4a       (full dashakam file for Podcast/Chant)
 */

export interface PhraseTimestamp {
  /** Phrase/line index within the verse (0-based) */
  index: number;
  /** End time of this phrase in seconds from verse audio start */
  endTime: number;
  /** Optional text snippet for debugging/admin */
  text?: string;
}

export interface VerseTimestamp {
  /** Verse/paragraph number (1-based) */
  verse: number;
  /** Start time of this verse in seconds (from full dashakam audio) */
  startTime: number;
  /** End time of this verse in seconds (from full dashakam audio) */
  endTime: number;
  /** Per-phrase/line timestamps within this verse (from per-verse audio file) */
  phraseEndTimes: PhraseTimestamp[];
}

export interface DashakamTimestamps {
  dashakam: number;
  /** Full dashakam audio file path */
  audioFile: string;
  /** Total duration in seconds */
  totalDuration: number;
  verses: VerseTimestamp[];
}

/** Default silence gap duration in seconds */
export const DEFAULT_SILENCE_GAP_SEC = 5;

/** Default number of repeats (silence gaps) between lines */
export const DEFAULT_REPEAT_COUNT = 2;

/**
 * Calculate total silence duration for a phrase based on repeat count.
 * Each repeat = 1 silence gap. Default 1 gap = 5 seconds.
 *
 * @param repeatCount Number of repeats (each repeat = 1 silence gap)
 * @param gapDurationSec Duration of each gap in seconds (default 5)
 */
export function calcSilenceDuration(repeatCount: number, gapDurationSec = DEFAULT_SILENCE_GAP_SEC): number {
  return repeatCount * gapDurationSec;
}

/**
 * Registry of all dashakam timestamps.
 * Admin populates this via JSON uploads.
 */
const timestampRegistry: Map<number, DashakamTimestamps> = new Map();

export function registerTimestamps(data: DashakamTimestamps) {
  timestampRegistry.set(data.dashakam, data);
}

export function getTimestamps(dashakamId: number): DashakamTimestamps | undefined {
  return timestampRegistry.get(dashakamId);
}

export function getVerseTimestamp(dashakamId: number, verseNumber: number): VerseTimestamp | undefined {
  return timestampRegistry.get(dashakamId)?.verses.find((v) => v.verse === verseNumber);
}

/**
 * Find which verse is active at a given playback time (for full-dashakam audio).
 * Used in Chant and Learn modules for lyric highlighting.
 */
export function getActiveVerseAtTime(dashakamId: number, currentTime: number): number | null {
  const ts = timestampRegistry.get(dashakamId);
  if (!ts) return null;
  for (const v of ts.verses) {
    if (currentTime >= v.startTime && currentTime <= v.endTime) return v.verse;
  }
  return null;
}

/**
 * Find which phrase is active within a verse at a given time (for per-verse audio).
 * Used in Learn module for line-level highlighting.
 */
export function getActivePhraseAtTime(dashakamId: number, verseNumber: number, currentTime: number): number {
  const vt = getVerseTimestamp(dashakamId, verseNumber);
  if (!vt || vt.phraseEndTimes.length === 0) return 0;
  for (let i = 0; i < vt.phraseEndTimes.length; i++) {
    const start = i === 0 ? 0 : vt.phraseEndTimes[i - 1].endTime;
    if (currentTime >= start && currentTime <= vt.phraseEndTimes[i].endTime) return i;
  }
  return vt.phraseEndTimes.length - 1;
}

// ─── Sample data for Dashakam 1 (admin will replace with real timestamps) ────

registerTimestamps({
  dashakam: 1,
  audioFile: "/audio/SL001.m4a",
  totalDuration: 0, // to be filled by admin
  verses: [
    { verse: 1, startTime: 0, endTime: 0, phraseEndTimes: [] },
    { verse: 2, startTime: 0, endTime: 0, phraseEndTimes: [] },
    { verse: 3, startTime: 0, endTime: 0, phraseEndTimes: [] },
    { verse: 4, startTime: 0, endTime: 0, phraseEndTimes: [] },
    { verse: 5, startTime: 0, endTime: 0, phraseEndTimes: [] },
    { verse: 6, startTime: 0, endTime: 0, phraseEndTimes: [] },
    { verse: 7, startTime: 0, endTime: 0, phraseEndTimes: [] },
    { verse: 8, startTime: 0, endTime: 0, phraseEndTimes: [] },
    { verse: 9, startTime: 0, endTime: 0, phraseEndTimes: [] },
    { verse: 10, startTime: 0, endTime: 0, phraseEndTimes: [] },
  ],
});

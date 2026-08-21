/**
 * Reusable audio resume service for Chant and Podcast.
 *
 * - Always persists to localStorage (works signed-out).
 * - For authenticated users, also upserts into public.audio_resume_positions
 *   with (user_id, mode) as the conflict target.
 * - Throttles periodic saves to at most one every 10s while playing.
 * - Exposes immediate flush + clear for deliberate events (pause, hide,
 *   pagehide, verse/dashakam change, finish, stop/end session).
 */
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ResumeMode = "chant" | "podcast";

export interface AudioResumePosition {
  mode: ResumeMode;
  dashakamNumber: number;
  verseNumber: number;
  currentTimeSeconds: number;
  durationSeconds: number;
  audioUrl: string | null;
  playMode: string | null;
  updatedAt: string; // ISO
}

const SAVE_INTERVAL_MS = 10_000;

const storageKey = (mode: ResumeMode) => `audio-resume:${mode}`;

// ─── localStorage ────────────────────────────────────────────────────────────

export function readLocalPosition(mode: ResumeMode): AudioResumePosition | null {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AudioResumePosition;
    if (!parsed || typeof parsed.currentTimeSeconds !== "number") return null;
    return { ...parsed, mode };
  } catch {
    return null;
  }
}

function writeLocalPosition(pos: AudioResumePosition) {
  try {
    localStorage.setItem(storageKey(pos.mode), JSON.stringify(pos));
  } catch {
    /* quota / private mode — ignore */
  }
}

function clearLocalPosition(mode: ResumeMode) {
  try {
    localStorage.removeItem(storageKey(mode));
  } catch {
    /* ignore */
  }
}

// ─── Supabase ────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function upsertRemotePosition(pos: AudioResumePosition): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    await (supabase as any)
      .from("audio_resume_positions")
      .upsert(
        {
          user_id: userId,
          mode: pos.mode,
          dashakam_number: pos.dashakamNumber,
          verse_number: pos.verseNumber,
          current_time_seconds: Math.round(pos.currentTimeSeconds),
          duration_seconds: Math.round(pos.durationSeconds),
          audio_url: pos.audioUrl,
          play_mode: pos.playMode,
          updated_at: pos.updatedAt,
        },
        { onConflict: "user_id,mode" },
      );
  } catch {
    // Silent — localStorage already holds the position
  }
}

async function fetchRemotePosition(mode: ResumeMode): Promise<AudioResumePosition | null> {
  const userId = await getUserId();
  if (!userId) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("audio_resume_positions")
      .select("*")
      .eq("user_id", userId)
      .eq("mode", mode)
      .maybeSingle();
    if (error || !data) return null;
    return {
      mode,
      dashakamNumber: data.dashakam_number ?? 1,
      verseNumber: data.verse_number ?? 0,
      currentTimeSeconds: Number(data.current_time_seconds) || 0,
      durationSeconds: Number(data.duration_seconds) || 0,
      audioUrl: data.audio_url ?? null,
      playMode: data.play_mode ?? null,
      updatedAt: data.updated_at ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

async function deleteRemotePosition(mode: ResumeMode): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    await (supabase as any)
      .from("audio_resume_positions")
      .delete()
      .eq("user_id", userId)
      .eq("mode", mode);
  } catch {
    /* ignore */
  }
}

/**
 * Newest-wins merge of the local and remote saved positions.
 */
export async function loadResumePosition(mode: ResumeMode): Promise<AudioResumePosition | null> {
  const [local, remote] = await Promise.all([
    Promise.resolve(readLocalPosition(mode)),
    fetchRemotePosition(mode),
  ]);
  if (!local) return remote;
  if (!remote) return local;
  const localTime = Date.parse(local.updatedAt || "") || 0;
  const remoteTime = Date.parse(remote.updatedAt || "") || 0;
  return remoteTime > localTime ? remote : local;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export type ResumeSnapshot = Omit<AudioResumePosition, "mode" | "updatedAt">;

export interface UseAudioResumeOptions {
  mode: ResumeMode;
  /** Returns the current playback snapshot, or null when nothing to save. */
  getSnapshot: () => ResumeSnapshot | null;
  /** Whether audio is currently playing (drives the 10s periodic save). */
  isPlaying: boolean;
}

export interface UseAudioResumeApi {
  /** Save immediately (pause, verse/dashakam change, teardown…). */
  saveNow: () => void;
  /** Throttled save — safe to call from timeupdate; at most 1 per 10s. */
  saveThrottled: () => void;
  /** Remove the saved position locally and remotely. */
  clearPosition: () => void;
  /** Read the newest saved position (local vs remote). */
  loadPosition: () => Promise<AudioResumePosition | null>;
}

export function useAudioResume({
  mode,
  getSnapshot,
  isPlaying,
}: UseAudioResumeOptions): UseAudioResumeApi {
  const snapshotRef = useRef(getSnapshot);
  snapshotRef.current = getSnapshot;

  const lastSaveRef = useRef(0);

  const saveNow = useCallback(() => {
    const snap = snapshotRef.current?.();
    if (!snap) return;
    if (!Number.isFinite(snap.currentTimeSeconds) || snap.currentTimeSeconds <= 0) return;
    const pos: AudioResumePosition = {
      ...snap,
      mode,
      updatedAt: new Date().toISOString(),
    };
    lastSaveRef.current = Date.now();
    writeLocalPosition(pos);
    void upsertRemotePosition(pos);
  }, [mode]);

  const saveThrottled = useCallback(() => {
    if (Date.now() - lastSaveRef.current < SAVE_INTERVAL_MS) return;
    saveNow();
  }, [saveNow]);

  const clearPosition = useCallback(() => {
    lastSaveRef.current = 0;
    clearLocalPosition(mode);
    void deleteRemotePosition(mode);
  }, [mode]);

  const loadPosition = useCallback(() => loadResumePosition(mode), [mode]);

  // Periodic save while playing (never tied to timeupdate)
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(saveNow, SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPlaying, saveNow]);

  // Immediate save on backgrounding / page unload
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    const onPageHide = () => saveNow();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [saveNow]);

  return { saveNow, saveThrottled, clearPosition, loadPosition };
}

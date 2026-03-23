import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PlaylistItem {
  dashakam_no: number;
  loops: number;
}

export interface Playlist {
  id: string;
  user_id: string;
  playlist_name: string;
  mode: string;
  dashakam_list: PlaylistItem[];
  is_shuffle: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaylistProgress {
  playlist_id: string;
  current_dashakam_index: number;
  current_verse_no: number;
  current_loop: number;
  mode: string;
}

// Presets
export const MINI_NARAYANEEYAM = [1, 5, 10, 12, 24, 25, 30, 34, 37, 38, 46, 50, 78, 87, 100];
export const SUPER_MINI = [1, 24, 37, 87, 100];

export function usePlaylist(mode: "chant" | "learn" | "podcast") {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [progress, setProgress] = useState<PlaylistProgress | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch user's playlists for this mode
  const fetchPlaylists = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_playlists")
        .select("*")
        .eq("user_id", user.id)
        .eq("mode", mode)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      // Parse dashakam_list from jsonb
      const parsed = (data || []).map((p: any) => ({
        ...p,
        dashakam_list: typeof p.dashakam_list === "string"
          ? JSON.parse(p.dashakam_list)
          : p.dashakam_list,
      }));
      setPlaylists(parsed);
    } catch (e) {
      console.warn("Failed to fetch playlists:", e);
    } finally {
      setLoading(false);
    }
  }, [user, mode]);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  // Save a new playlist
  const savePlaylist = async (name: string, items: PlaylistItem[], isShuffle: boolean) => {
    if (!user) throw new Error("Must be signed in");
    const { data, error } = await supabase
      .from("user_playlists")
      .insert({
        user_id: user.id,
        playlist_name: name,
        mode,
        dashakam_list: items,
        is_shuffle: isShuffle,
      })
      .select()
      .single();
    if (error) throw error;
    await fetchPlaylists();
    return data;
  };

  // Delete a playlist
  const deletePlaylist = async (id: string) => {
    await supabase.from("playlist_progress").delete().eq("playlist_id", id);
    await supabase.from("user_playlists").delete().eq("id", id);
    if (activePlaylist?.id === id) {
      setActivePlaylist(null);
      setProgress(null);
    }
    await fetchPlaylists();
  };

  // Save progress
  const saveProgress = async (playlistId: string, dashakamIndex: number, verseNo: number, loop: number) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      playlist_id: playlistId,
      current_dashakam_index: dashakamIndex,
      current_verse_no: verseNo,
      current_loop: loop,
      mode,
      updated_at: new Date().toISOString(),
    };
    // Upsert on (user_id, playlist_id)
    const { error } = await supabase
      .from("playlist_progress")
      .upsert(payload, { onConflict: "user_id,playlist_id" });
    if (error) console.warn("Failed to save playlist progress:", error);
    setProgress({ playlist_id: playlistId, current_dashakam_index: dashakamIndex, current_verse_no: verseNo, current_loop: loop, mode });
  };

  // Load progress for a playlist
  const loadProgress = async (playlistId: string): Promise<PlaylistProgress | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("playlist_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("playlist_id", playlistId)
      .single();
    if (error || !data) return null;
    const p: PlaylistProgress = {
      playlist_id: data.playlist_id,
      current_dashakam_index: data.current_dashakam_index,
      current_verse_no: data.current_verse_no,
      current_loop: data.current_loop,
      mode: data.mode,
    };
    setProgress(p);
    return p;
  };

  return {
    playlists,
    activePlaylist,
    setActivePlaylist,
    progress,
    setProgress,
    loading,
    savePlaylist,
    deletePlaylist,
    saveProgress,
    loadProgress,
    refetch: fetchPlaylists,
  };
}

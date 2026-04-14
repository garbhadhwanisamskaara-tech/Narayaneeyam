import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListMusic, X, Play, Shuffle, Save, FolderOpen, Trash2,
  Plus, Minus, GripVertical, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePlaylist,
  MINI_NARAYANEEYAM,
  SUPER_MINI,
  type PlaylistItem,
  type Playlist,
} from "@/hooks/usePlaylist";
import { getDashakamName } from "@/hooks/useDashakam";

interface PlaylistBuilderProps {
  mode: "chant" | "learn" | "podcast";
  open: boolean;
  onClose: () => void;
  onStartPlaylist: (items: PlaylistItem[], playlistId?: string, resumeIndex?: number, resumeVerse?: number, resumeLoop?: number) => void;
}

export default function PlaylistBuilder({ mode, open, onClose, onStartPlaylist }: PlaylistBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { playlists, savePlaylist, deletePlaylist, loadProgress } = usePlaylist(mode);

  const [selected, setSelected] = useState<PlaylistItem[]>([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const selectedNos = useMemo(() => new Set(selected.map(s => s.dashakam_no)), [selected]);

  const toggleDashakam = (no: number) => {
    if (selectedNos.has(no)) {
      setSelected(prev => prev.filter(s => s.dashakam_no !== no));
    } else {
      setSelected(prev => [...prev, { dashakam_no: no, loops: 1 }]);
    }
  };

  const applyPreset = (nos: number[]) => {
    setSelected(nos.map(n => ({ dashakam_no: n, loops: 1 })));
  };

  const updateLoops = (no: number, delta: number) => {
    setSelected(prev => prev.map(s =>
      s.dashakam_no === no
        ? { ...s, loops: Math.max(1, Math.min(10, s.loops + delta)) }
        : s
    ));
  };

  const removeDashakam = (no: number) => {
    setSelected(prev => prev.filter(s => s.dashakam_no !== no));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= selected.length) return;
    setSelected(prev => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  };

  const handleSave = async () => {
    if (!saveName.trim()) { toast({ title: "Enter a name", variant: "destructive" }); return; }
    if (selected.length === 0) { toast({ title: "Select at least one dashakam", variant: "destructive" }); return; }
    try {
      await savePlaylist(saveName.trim(), selected, isShuffle);
      toast({ title: "Playlist saved!" });
      setShowSaveInput(false);
      setSaveName("");
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
  };

  const handleLoadPlaylist = async (playlist: Playlist) => {
    const items = playlist.dashakam_list;
    setSelected(items);
    setIsShuffle(playlist.is_shuffle);
    // Check for saved progress
    const prog = await loadProgress(playlist.id);
    if (prog) {
      toast({ title: "Resuming from where you left off" });
      onStartPlaylist(items, playlist.id, prog.current_dashakam_index, prog.current_verse_no, prog.current_loop);
    } else {
      onStartPlaylist(items, playlist.id);
    }
    onClose();
  };

  const handlePlay = () => {
    if (selected.length === 0) { toast({ title: "Select at least one dashakam", variant: "destructive" }); return; }
    let items = [...selected];
    if (isShuffle) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
    }
    onStartPlaylist(items);
    onClose();
  };

  const getName = (no: number) => getDashakamName(no);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-background rounded-t-2xl lg:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ListMusic className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">Custom Playlist</h2>
              <span className="text-xs text-muted-foreground font-sans capitalize">({mode})</span>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Tabs: Build / Saved */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaved(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans transition-colors ${!showSaved ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                Build Playlist
              </button>
              <button
                onClick={() => setShowSaved(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans transition-colors ${showSaved ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                <FolderOpen className="h-3 w-3 inline mr-1" />
                Saved ({playlists.length})
              </button>
            </div>

            {showSaved ? (
              /* Saved Playlists */
              <div className="space-y-2">
                {playlists.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-sans text-center py-8">No saved playlists yet</p>
                ) : (
                  playlists.map(pl => (
                    <div key={pl.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-sans font-medium text-foreground truncate">{pl.playlist_name}</p>
                        <p className="text-[10px] text-muted-foreground font-sans">
                          {pl.dashakam_list.length} dashakams · {pl.dashakam_list.reduce((s, i) => s + i.loops, 0)} total loops · {pl.is_shuffle ? "Shuffled" : "Ordered"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLoadPlaylist(pl)}
                        className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        title="Play"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => { await deletePlaylist(pl.id); toast({ title: "Deleted" }); }}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                {/* Presets */}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => applyPreset(MINI_NARAYANEEYAM)} className="rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-sans text-foreground hover:bg-secondary/20 transition-colors">
                    Mini Narayaneeyam (15)
                  </button>
                  <button onClick={() => applyPreset(SUPER_MINI)} className="rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-sans text-foreground hover:bg-secondary/20 transition-colors">
                    Super Mini (5)
                  </button>
                  <button onClick={() => setSelected(Array.from({ length: 100 }, (_, i) => ({ dashakam_no: i + 1, loops: 1 })))} className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors">
                    Select All
                  </button>
                  <button onClick={() => setSelected([])} className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors">
                    Clear All
                  </button>
                </div>

                {/* 100-box Grid */}
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 100 }, (_, i) => i + 1).map(no => (
                    <button
                      key={no}
                      onClick={() => toggleDashakam(no)}
                      title={getDashakamName(no)}
                      className={`aspect-square rounded-md text-[10px] font-sans font-semibold transition-all ${
                        selectedNos.has(no)
                          ? "bg-secondary text-secondary-foreground shadow-sm scale-105"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {no}
                    </button>
                  ))}
                </div>

                {/* Selected list */}
                {selected.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-sans font-medium text-foreground">
                      Selected ({selected.length}) · Total loops: {selected.reduce((s, i) => s + i.loops, 0)}
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {selected.map((item, idx) => (
                        <div key={item.dashakam_no} className="flex items-center gap-2 rounded-lg bg-card border border-border px-2 py-1.5">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button onClick={() => moveItem(idx, 1)} disabled={idx === selected.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-xs font-sans font-semibold text-primary w-6">{item.dashakam_no}</span>
                          <span className="text-xs font-sans text-foreground flex-1 truncate">{getDashakamName(item.dashakam_no)}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateLoops(item.dashakam_no, -1)} className="p-0.5 rounded bg-muted hover:bg-muted/80 transition-colors">
                              <Minus className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <span className="text-xs font-sans font-semibold w-4 text-center text-foreground">{item.loops}</span>
                            <button onClick={() => updateLoops(item.dashakam_no, 1)} className="p-0.5 rounded bg-muted hover:bg-muted/80 transition-colors">
                              <Plus className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                          <button onClick={() => removeDashakam(item.dashakam_no)} className="p-0.5 text-destructive/60 hover:text-destructive transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer actions */}
          {!showSaved && (
            <div className="border-t border-border px-5 py-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-sans transition-colors ${
                  isShuffle ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Shuffle className="h-3.5 w-3.5" /> Shuffle
              </button>

              {user && (
                <>
                  {showSaveInput ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        placeholder="Playlist name…"
                        className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-sans text-foreground w-36 focus:outline-none focus:ring-1 focus:ring-primary"
                        onKeyDown={e => e.key === "Enter" && handleSave()}
                      />
                      <Button size="sm" onClick={handleSave} className="text-xs bg-primary text-primary-foreground h-7">Save</Button>
                      <button onClick={() => setShowSaveInput(false)} className="text-muted-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSaveInput(true)}
                      className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Save className="h-3.5 w-3.5" /> Save
                    </button>
                  )}
                </>
              )}

              <div className="flex-1" />

              <Button
                onClick={handlePlay}
                disabled={selected.length === 0}
                className="bg-primary text-primary-foreground"
                size="sm"
              >
                <Play className="h-4 w-4 mr-1" /> Play ({selected.length})
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

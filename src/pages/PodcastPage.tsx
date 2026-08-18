              <p className="text-xs text-muted-foreground font-sans">Overall Progress</p>
              <p className="text-xs text-muted-foreground font-sans">{currentDashakam}/100</p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${currentDashakam}%` }} />
            </div>
          </div>
        )}

        {/* Dashakam List Toggle */}
        <button
          onClick={() => setShowDashakamList(!showDashakamList)}
          className="flex items-center gap-2 mb-4 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
        >
          <ListMusic className="h-4 w-4" />
          {showDashakamList ? "Hide Dashakam List" : "Show Dashakam List (100 Dashakams)"}
        </button>

        {/* Dashakam List */}
        {showDashakamList && (
          <div className="rounded-xl border border-border bg-card max-h-96 overflow-y-auto">
            {dashakamDropdown.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  playSessionRef.current += 1; releaseAudio();
                  pausedRef.current = false;
                  setCurrentDashakam(d.id); setCurrentLoop(0); setCompleted(false);
                  saveProgress({ lastDashakam: d.id, lastPage: "/podcast" });
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-sans border-b border-border last:border-b-0 transition-colors ${
                  d.id === currentDashakam
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="w-8 text-right text-xs text-muted-foreground">{d.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{d.title} {d.hasPodcast ? "🎧" : ""}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.titleSanskrit}</p>
                </div>
                {d.id === currentDashakam && isPlaying && (
                  <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <PlaylistBuilder
        mode="podcast"
        open={playlistBuilderOpen}
        onClose={() => setPlaylistBuilderOpen(false)}
        onStartPlaylist={handleStartPlaylist}
      />
    </div>
  );
}
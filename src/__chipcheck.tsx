import { createRoot } from "react-dom/client";
import VerseIcons from "@/components/VerseIcons";
import BookmarkButton from "@/components/BookmarkButton";
import FavouriteButton from "@/components/FavouriteButton";

// TEMPORARY verification harness — deleted after the chip check.
export function mountChip(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  document.getElementById("chipcheck")?.remove();
  const host = document.createElement("div");
  host.id = "chipcheck";
  host.className = "fixed inset-x-4 top-4 z-[999]";
  document.body.appendChild(host);
  createRoot(host).render(
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground font-sans flex items-center gap-1.5">
          Dashakam 1 · Verse 8 · Meter Anustup
        </span>
        <div className="flex items-center gap-1">
          <VerseIcons
            prasadam="Tulsi leaves"
            slokaAudioId="abc"
            onPlaySloka={() => {
              (window as any).__slokaTaps = ((window as any).__slokaTaps || 0) + 1;
            }}
          />
          <BookmarkButton active={false} onClick={() => {}} />
          <FavouriteButton active={true} onClick={() => {}} />
        </div>
      </div>
      <p className="font-body text-lg text-foreground">
        dhatte tvam jagad-anagharupam
      </p>
    </div>
  );
  return true;
}

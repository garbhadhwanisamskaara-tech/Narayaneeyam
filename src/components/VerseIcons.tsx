import { useState, useRef, useEffect } from "react";
import { Bell, Flame } from "lucide-react";
import { playBellAudio } from "@/lib/bellAudio";

interface VerseIconsProps {
  bell?: boolean;
  prasadam?: string;
  slokaAudioId?: string | null;
}

export default function VerseIcons({ bell, prasadam, slokaAudioId }: VerseIconsProps) {
  const [showPrasadam, setShowPrasadam] = useState(false);
  const prasadamRef = useRef<HTMLDivElement>(null);

  // Dismiss prasadam tooltip on outside tap (mobile)
  useEffect(() => {
    if (!showPrasadam) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (prasadamRef.current && !prasadamRef.current.contains(e.target as Node)) {
        setShowPrasadam(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showPrasadam]);

  if (!bell && !prasadam && !slokaAudioId) return null;

  return (
    <div className="flex items-center gap-2">
      {bell && (
        <button
          onMouseEnter={() => playBellAudio()}
          onClick={() => playBellAudio()}
          className="flex items-center justify-center text-gold hover:text-gold-light transition-transform hover:scale-110"
          title="Ring bell here"
          aria-label="Ring bell"
        >
          <Bell className="h-5 w-5" fill="currentColor" strokeWidth={1.5} />
        </button>
      )}

      {prasadam && (
        <div ref={prasadamRef} className="relative">
          <button
            onMouseEnter={() => setShowPrasadam(true)}
            onMouseLeave={() => setShowPrasadam(false)}
            onClick={() => setShowPrasadam((prev) => !prev)}
            className="flex items-center justify-center text-gold hover:text-gold-light transition-transform hover:scale-110"
            aria-label="View prasadam"
          >
            <Flame className="h-5 w-5" fill="currentColor" strokeWidth={1.5} />
          </button>

          {showPrasadam && (
            <div className="absolute bottom-full right-0 mb-2 z-50 min-w-[180px] max-w-[260px] rounded-lg bg-gold px-3 py-2 shadow-lg">
              <p className="text-xs font-semibold text-primary mb-0.5">🪔 Prasadam</p>
              <p className="text-xs text-primary leading-relaxed">{prasadam}</p>
              <div className="absolute bottom-0 right-3 translate-y-1/2 rotate-45 h-2 w-2 bg-gold" />
            </div>
          )}
        </div>
      )}

      {slokaAudioId && (
        <span
          className="flex items-center justify-center text-gold text-base cursor-default"
          title="This verse has a supplementary sloka"
          aria-label="Sloka available"
        >
          📿
        </span>
      )}
    </div>
  );
}

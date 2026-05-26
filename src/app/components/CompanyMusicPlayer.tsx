import { useCallback, useEffect, useRef, useState } from "react";
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

export const COMPANY_HYMNS = [
  { id: "1", title: "Hymn W&G DOM 1", src: "/music/hymn1.mp3" },
  { id: "2", title: "Hymn W&G DOM 2", src: "/music/hymn2.mp3" },
  { id: "3", title: "Hymn W&G DOM 3", src: "/music/hymn3.mp3" },
  { id: "4", title: "Hymn W&G DOM 4", src: "/music/hymn4.mp3" },
] as const;

const LS_TRACK = "kw-music-track";
const LS_VOLUME = "kw-music-volume";

function readTrackIndex(): number {
  try {
    const n = parseInt(localStorage.getItem(LS_TRACK) || "0", 10);
    return Number.isFinite(n) && n >= 0 && n < COMPANY_HYMNS.length ? n : 0;
  } catch {
    return 0;
  }
}

function readVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem(LS_VOLUME) || "0.45");
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.45;
  } catch {
    return 0.45;
  }
}

export function CompanyMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [trackIndex, setTrackIndex] = useState(readTrackIndex);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(readVolume);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);

  const track = COMPANY_HYMNS[trackIndex];

  useEffect(() => {
    localStorage.setItem(LS_TRACK, String(trackIndex));
  }, [trackIndex]);

  useEffect(() => {
    localStorage.setItem(LS_VOLUME, String(volume));
  }, [volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.src = track.src;
    el.load();
  }, [trackIndex, track.src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.preload = "auto";
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [playing, trackIndex]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const goTrack = useCallback((delta: number) => {
    setTrackIndex((i) => (i + delta + COMPANY_HYMNS.length) % COMPANY_HYMNS.length);
    setPlaying(true);
  }, []);

  return (
    <div className="relative shrink-0">
      <audio
        ref={audioRef}
        preload="metadata"
        src={track.src}
        onEnded={() => goTrack(1)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Hymny firmowe — muzyka w tle"
        className={`flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg text-xs transition-colors border ${
          open || playing
            ? "bg-secondary/80 border-border text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        }`}
      >
        <Music2 size={14} className={playing ? "text-primary" : ""}/>
        <span className="hidden md:inline max-w-[88px] truncate text-[11px]">
          {playing ? track.title : "Hymny"}
        </span>
        {playing && (
          <span className="hidden sm:flex gap-0.5 items-end h-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-0.5 bg-primary/70 rounded-full animate-pulse"
                style={{ height: `${6 + (i % 2) * 4}px`, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden/>
          <div className="absolute right-0 top-full mt-1.5 z-50 w-[min(calc(100vw-2rem),280px)] rounded-xl border border-border bg-card/98 backdrop-blur-sm shadow-lg p-3 space-y-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Hymny W&G DOM</p>

            <select
              value={trackIndex}
              onChange={(e) => {
                setTrackIndex(Number(e.target.value));
                setPlaying(true);
              }}
              className="w-full bg-secondary/60 rounded-lg px-2.5 py-1.5 text-xs border border-border focus:border-primary focus:outline-none"
            >
              {COMPANY_HYMNS.map((h, i) => (
                <option key={h.id} value={i}>{h.title}</option>
              ))}
            </select>

            <div className="flex items-center justify-center gap-1">
              <button type="button" onClick={() => goTrack(-1)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Poprzedni">
                <SkipBack size={15}/>
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="p-2.5 rounded-full bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                title={playing ? "Pauza" : "Odtwórz"}
              >
                {playing ? <Pause size={16}/> : <Play size={16} className="ml-0.5"/>}
              </button>
              <button type="button" onClick={() => goTrack(1)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Następny">
                <SkipForward size={15}/>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title={muted ? "Włącz dźwięk" : "Wycisz"}
              >
                {muted || volume === 0 ? <VolumeX size={14}/> : <Volume2 size={14}/>}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  setMuted(v === 0);
                }}
                className="flex-1 h-1 accent-primary cursor-pointer"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

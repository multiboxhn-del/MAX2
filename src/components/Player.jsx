import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Loader2,
  Heart,
  Share2,
  Instagram,
  Facebook,
} from "lucide-react";

const VOLUME_KEY = "online-radio-volume-v1";
const AUTOPLAY_KEY = "online-radio-autoplay-v1";

export default function OnlineRadioPlayer({
  streamUrl = "https://app.sonicpanelradio.com/8246/stream",
  stationName = "MAX RADIO",
  statusUrl,
  coverFallback = "https://eslamax.com/wp-content/uploads/2025/03/cropped-3.png",
  themeColor = "#8A3D9C",
  onLike,
  onShare,
  socialLinks = {
    tiktok: "https://www.tiktok.com/@eslamaxradio?_t=ZM-8vP93FMKnPJ&_r=1",
    instagram: "https://www.instagram.com/eslamaxradio?igsh=MXB5Nzdrd2RjdG1qcw==",
    facebook: "https://www.facebook.com/profile.php?id=61575074636162",
  },
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [nowPlaying, setNowPlaying] = useState("");
  const coverUrl = coverFallback; // 2. SIMPLIFICADO: Ya no es estado si es estático
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  // Restaurar volumen
  useEffect(() => {
    const saved = localStorage.getItem(VOLUME_KEY);
    if (saved) {
      const v = parseFloat(saved);
      if (!Number.isNaN(v)) setVolume(Math.min(1, Math.max(0, v)));
    }
  }, []);

  // Aplicar volumen al <audio>
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  // Autoplay
  useEffect(() => {
    const audio = audioRef.current;
    const shouldAutoplay = localStorage.getItem(AUTOPLAY_KEY) === "1";
    if (!audio || !shouldAutoplay) return;
    const tryPlay = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {}
    };
    tryPlay();
  }, []);

  // Reconexión automática
  useEffect(() => {
    const onVisible = () => {
      const audio = audioRef.current;
      if (!audio) return;
      const shouldAutoplay = localStorage.getItem(AUTOPLAY_KEY) === "1";
      if (shouldAutoplay) audio.play().catch(() => {});
    };
    const onVis = () => {
      if (document.visibilityState === "visible") onVisible();
    };
    document.addEventListener("visibilitychange", onVis);

    const id = setInterval(() => {
      const a = audioRef.current;
      if (!a) return;
      const shouldAutoplay = localStorage.getItem(AUTOPLAY_KEY) === "1";
      const unhealthy = a.error || a.readyState === 0 || a.networkState === 3;
      if (shouldAutoplay && !a.paused && unhealthy) {
        showToast("Reconectando transmisión…");
        a.load();
        a.play().catch(() => {});
      }
    }, 60000);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(id);
    };
  }, [showToast]);

  // Modo segundo plano (Cordova)
  useEffect(() => {
    function onDeviceReady() {
      if (
        window.cordova &&
        window.cordova.plugins &&
        window.cordova.plugins.backgroundMode
      ) {
        console.log("Configurando modo segundo plano...");

        window.cordova.plugins.backgroundMode.enable();
        try {
          window.cordova.plugins.backgroundMode.disableBatteryOptimizations();
        } catch {}

        window.cordova.plugins.backgroundMode.setDefaults({
          title: stationName,
          text: "Escuchando la radio en vivo.",
          isMedia: true,
          icon: "res://mipmap/ic_launcher",
          hidden: false,
          resume: true,
        });

        window.cordova.plugins.backgroundMode.on("activate", () => {
          if (audioRef.current) audioRef.current.play().catch(() => {});
        });

        window.cordova.plugins.backgroundMode.on("deactivate", () => {
          if (audioRef.current) audioRef.current.pause();
        });
      }
    }
    document.addEventListener("deviceready", onDeviceReady, false);
    return () => {
      document.removeEventListener("deviceready", onDeviceReady, false);
    };
  }, [stationName]);

  // Controles (envueltos en useCallback para los atajos de teclado)
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setError("");
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      localStorage.removeItem(AUTOPLAY_KEY);
    } else {
      try {
        setBuffering(true);
        await audio.play();
        setIsPlaying(true);
        localStorage.setItem(AUTOPLAY_KEY, "1");
      } catch (err) {
        setError("No se pudo iniciar la reproducción. Da clic de nuevo.");
      } finally {
        setBuffering(false);
      }
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  const setVol = useCallback(
    (v) => {
      const nv = Math.min(1, Math.max(0, v));
      setVolume(nv);
      if (nv > 0 && isMuted) setIsMuted(false);
    },
    [isMuted]
  );

  const scheduleRetry = useCallback(() => {
    const delay = Math.min(10000, 2000 * (retryCount + 1));
    showToast("Reconectando transmisión…");
    setTimeout(() => {
      setRetryCount((c) => c + 1);
      const audio = audioRef.current;
      if (!audio) return;
      audio.load();
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setError("");
          setBuffering(false);
          showToast("Conexión restablecida ✅");
        })
        .catch(() => {});
    }, delay);
  }, [retryCount, showToast]);

  // Meta Now Playing
  useEffect(() => {
    if (!statusUrl) return;
    const fetchMeta = async () => {
      try {
        const res = await fetch(statusUrl, { cache: "no-store" });
        if (!res.ok) throw new Error("status no ok");
        const data = await res.json();
        const source = Array.isArray(data?.icestats?.source)
          ? data.icestats.source[0]
          : data?.icestats?.source;
        const np = source?.title || source?.stream_title || "";
        if (np) setNowPlaying(np);
      } catch (err) {
        // 3. MEJORA: Añadido console.error para depuración
        console.error("Error fetching radio metadata:", err);
      }
    };
    fetchMeta();
    const id = setInterval(fetchMeta, 20000);
    return () => clearInterval(id);
  }, [statusUrl]);

  // Eventos del <audio> (envueltos en useCallback)
  const onWaiting = useCallback(() => setBuffering(true), []);
  
  const onPlaying = useCallback(() => {
    setBuffering(false);
    setIsPlaying(true);
    setError("");
    localStorage.setItem(AUTOPLAY_KEY, "1");
  }, []);

  const onError = useCallback(() => {
    setBuffering(false);
    setIsPlaying(false);
    setError("Se perdió la conexión con el stream. Reintentando…");
    scheduleRetry();
  }, [scheduleRetry]);

  // 5. NUEVO: Atajos de teclado
  useEffect(() => {
    const handleKeydown = (e) => {
      // No activar atajos si se está escribiendo en un input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "KeyM":
          toggleMute();
          break;
        case "ArrowUp":
          e.preventDefault();
          setVol(volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVol(volume - 0.05);
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [volume, togglePlay, toggleMute, setVol]);

  const volumeIcon =
    isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />;
  const playIcon = isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />;

  return (
    <div
      className="w-full max-w-xl mx-auto p-4"
      // 1. MEJORA: Aplicar themeColor como variable CSS
      style={{ "--theme-color": themeColor }}
    >
      <div
        className="relative rounded-2xl bg-gradient-to-br from-[var(--theme-color)] via-[#0E0E0E] to-[#0E0E0E] text-white shadow-2xl overflow-hidden"
      >
        {/* Encabezado */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div
            className={`relative h-14 w-14 rounded-xl overflow-hidden bg-zinc-700 flex items-center justify-center ${
              isPlaying ? "ring-2 ring-[#F6C400] animate-pulse" : ""
            }`}
          >
            <img src={coverUrl} alt="logo" className="h-full w-full object-cover" />
            {buffering && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-[#F6C400]/90">En vivo</p>
            <h2 className="text-lg md:text-xl font-semibold truncate">{stationName}</h2>
            <p className="text-sm md:text-base text-zinc-300 truncate" title={nowPlaying}>
              {nowPlaying || "Conéctate con la mejor música"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={
                onShare ||
                (() =>
                  navigator.share?.({
                    title: stationName,
                    text: nowPlaying || stationName,
                    url: window.location.href,
                  }))
              }
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 transition"
              title="Compartir"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={onLike || (() => alert("¡Gracias por el like!"))}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 transition"
              title="Me gusta"
            >
              <Heart className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Controles */}
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="h-12 w-12 rounded-full bg-[#F6C400] hover:bg-[#FFD633] text-black grid place-items-center shadow-lg active:scale-95 transition"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            {buffering ? <Loader2 className="h-6 w-6 animate-spin" /> : playIcon}
          </button>

          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 transition"
              aria-label="Mute"
            >
              {volumeIcon}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVol(parseFloat(e.target.value))}
              // 1. MEJORA: Usar la variable CSS para themeColor
              className="w-28 sm:w-36 md:w-40 lg:w-48 accent-[var(--theme-color)]"
            />
            <span className="w-10 text-right tabular-nums text-sm text-zinc-300">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                const audio = audioRef.current;
                if (!audio) return;
                setError("");
                setBuffering(true);
                audio.load();
                audio
                  .play()
                  .then(() => setIsPlaying(true))
                  .catch(() => {})
                  .finally(() => setBuffering(false));
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 transition"
              title="Reconectar"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 pb-4 -mt-2">
            <div className="text-amber-300 text-sm bg-amber-900/20 border border-amber-500/30 rounded-lg p-2">
              {error}
            </div>
          </div>
        )}

        {/* Redes sociales */}
        <div className="px-4 pb-2 flex items-center gap-2 text-zinc-300">
          <span className="text-xs uppercase tracking-widest mr-1">Síguenos</span>
          <a
            href={socialLinks?.tiktok}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
            aria-label="TikTok"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M41 17.2c-3.8-.8-7-3.1-9-6.3V31c0 7.5-6.1 13.6-13.6 13.6S4.8 38.5 4.8 31 10.9 17.4 18.4 17.4c1.3 0 2.6.2 3.8.6v6a7.7 7.7 0 0 0-3.8-1c-4.2 0-7.6 3.4-7.6 7.6s3.4 7.6 7.6 7.6 7.6-3.4 7.6-7.6V2h6.2c1.3 4.7 5.3 8.3 10.2 9.1V17.2z" />
            </svg>
          </a>
          <a
            href={socialLinks?.instagram}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
            aria-label="Instagram"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href={socialLinks?.facebook}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
            aria-label="Facebook"
          >
            <Facebook className="h-5 w-5" />
          </a>
        </div>

        {/* Botón PayPal más pequeño y gris */}
        <div className="px-4 pb-4 text-center">
          <a
            href="https://www.paypal.com/ncp/payment/NAMENC6BATVWG"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium shadow-md transition-transform active:scale-95"
            aria-label="Apoyar con PayPal"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M12 2C6.5 2 2 6.4 2 11.9S6.5 21.8 12 21.8 22 17.4 22 11.9 17.5 2 12 2zm.7 8.3c-.4 1.4-1.7 2.3-3.1 2.3H9.2l-.7 3.4H7.4l1.2-6H10c.7 0 1.4-.5 1.5-1.2.1-.4 0-.8-.2-1-.3-.3-.8-.4-1.3-.4H8.3l.3-1.3h1.6c.9 0 1.8.3 2.4 1 .4.5.6 1.2.4 1.9z" />
            </svg>
            Apoyar
          </a>
        </div>

        <audio
          ref={audioRef}
          src={streamUrl}
          preload="none"
          onWaiting={onWaiting}
          onPlaying={onPlaying}
          onError={onError}
          onStalled={() => setBuffering(true)}
          onPause={() => {
            setIsPlaying(false);
            localStorage.removeItem(AUTOPLAY_KEY);
          }}
        />
      </div>

      <p className="text-center text-xs text-zinc-500 mt-2">
        Atajos: Space ▶/⏸, M mute, ↑/↓ volumen
      </p>

      {toastVisible && (
        <div className="fixed bottom-16 inset-x-0 z-[60] flex justify-center pointer-events-none md:bottom-6">
          <div className="pointer-events-auto bg-black/80 text-white text-sm px-3 py-2 rounded-full border border-white/10 shadow-lg">
            {toastMsg}
          </div>
        </div>
      )}

      {/* Mini player móvil */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-50"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        <div className="mx-auto max-w-xl">
          <div className="mx-2 rounded-2xl bg-[#1a1a1a]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1a1a1a]/70 border border-white/10 shadow-lg">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-10 w-10 rounded-xl overflow-hidden bg-zinc-700 flex items-center justify-center">
                {/* 2. MEJORA: Usar coverUrl por consistencia */}
                <img src={coverUrl || undefined} alt="cover" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-[#F6C400]/90">En vivo</p>
                <p className="text-sm font-semibold truncate">{stationName}</p>
                <p className="text-xs text-zinc-400 truncate" title={nowPlaying || ""}>
                  {nowPlaying || "Reproduciendo..."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full bg-[#F6C400] hover:bg-[#FFD633] text-black grid place-items-center active:scale-95 transition"
                  aria-label={isPlaying ? "Pausar" : "Reproducir"}
                >
                  {/* 4. MEJORA: Añadido estado de buffering */}
                  {buffering ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
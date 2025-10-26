import { useEffect, useRef, useState } from "react";

const STREAM_URL = "https://app.sonicpanelradio.com/8246/stream";
const LOGO_URL   = "https://eslamax.com/wp-content/uploads/2025/03/cropped-3.png";

// URLs sociales
const LINKS = {
  tiktok: "https://www.tiktok.com/@eslamaxradio?_t=ZM-8vP93FMKnPJ&_r=1",
  instagram: "https://www.instagram.com/eslamaxradio?igsh=MXB5Nzdrd2RjdG1qcw==",
  facebook: "https://www.facebook.com/profile.php?id=61575074636162",
  paypal: "https://www.paypal.com/ncp/payment/NAMENC6BATVWG",
};

export default function Player() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume]   = useState(0.9);
  const [status, setStatus]   = useState("Listo");

  // agrega cache-buster para evitar buffers viejos
  const cacheBustedSrc = `${STREAM_URL}?t=${Date.now()}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    const onPlay = () => setStatus("Reproduciendo…");
    const onPause = () => setStatus("Pausado");
    const onStalled = () => setStatus("Reconectando…");
    const onError = () => setStatus("Error de conexión. Intentando…");

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("stalled", onStalled);
    audio.addEventListener("error", onError);

    // reintento automático cada 60s si no está reproduciendo
    const id = setInterval(() => {
      if (!audio.paused) return;
      try {
        audio.src = `${STREAM_URL}?t=${Date.now()}`;
        audio.load();
        // iOS/Android requieren interacción para autoplay;
        // por eso solo intentamos si ya hubo un play previo.
        if (playing) audio.play().catch(() => {});
      } catch {}
    }, 60_000);

    return () => {
      clearInterval(id);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("stalled", onStalled);
      audio.removeEventListener("error", onError);
    };
  }, [playing, volume]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      // fuerza nueva conexión al darle play
      audio.src = `${STREAM_URL}?t=${Date.now()}`;
      audio.load();
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setStatus("Toca para reproducir (autoplay bloqueado)");
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <img src={LOGO_URL} alt="Max Radio" style={styles.logo} />
        <div>
          <h1 style={styles.title}>MAX Radio</h1>
          <p style={styles.subtitle}>Disfruta de tus canciones favoritas 24/7</p>
        </div>
      </header>

      <div style={styles.playerCard}>
        <audio ref={audioRef} src={cacheBustedSrc} preload="none" />
        <div style={styles.controls}>
          <button onClick={togglePlay} style={styles.playBtn}>
            {playing ? "⏸ Pausar" : "▶️ Reproducir"}
          </button>

          <div style={styles.volBox}>
            <span>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v;
              }}
              style={styles.slider}
            />
          </div>
        </div>

        <div style={styles.status}>📡 {status}</div>

        <div style={styles.row}>
          <a href={LINKS.paypal} target="_blank" rel="noopener noreferrer" style={styles.paypal}>
            💖 Apoyar en PayPal
          </a>
        </div>

        <div style={styles.socials}>
          <a href={LINKS.tiktok}     target="_blank" rel="noopener noreferrer">🎵 TikTok</a>
          <a href={LINKS.instagram}  target="_blank" rel="noopener noreferrer">📸 Instagram</a>
          <a href={LINKS.facebook}   target="_blank" rel="noopener noreferrer">📘 Facebook</a>
        </div>
      </div>

      {/* mini-player fijo en móvil */}
      <div style={styles.floating}>
        <button onClick={togglePlay} style={styles.floatingBtn}>
          {playing ? "⏸" : "▶️"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap:   { minHeight: "100vh", background: "#0b0b0f", color: "white", padding: "24px" },
  header: { display: "flex", gap: "16px", alignItems: "center", marginBottom: 16 },
  logo:   { width: 72, height: 72, borderRadius: "50%", objectFit: "cover" },
  title:  { margin: 0, fontSize: 28, letterSpacing: 1 },
  subtitle: { margin: "4px 0 0", opacity: 0.8 },
  playerCard: { background: "#16161d", borderRadius: 16, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,.4)" },
  controls: { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" },
  playBtn: { background: "#ff004d", border: "none", color: "white", padding: "10px 16px", borderRadius: 12, cursor: "pointer", fontWeight: 700 },
  volBox: { display: "flex", alignItems: "center", gap: 8 },
  slider: { width: 160 },
  status: { marginTop: 10, fontSize: 14, opacity: 0.85 },
  row: { marginTop: 16 },
  paypal: { background: "#ffc439", color: "#111", padding: "10px 14px", borderRadius: 12, fontWeight: 700, textDecoration: "none" },
  socials: { display: "flex", gap: 14, marginTop: 12, opacity: 0.95 },
  floating: { position: "fixed", right: 12, bottom: 12 },
  floatingBtn: { width: 56, height: 56, borderRadius: "50%", border: "none", background: "#ff004d", color: "#fff", fontSize: 22, cursor: "pointer" },
};

/**
 * Effets sonores synthétisés en temps réel (Web Audio) : aucun fichier audio,
 * aucune ressource externe, aucun accès au micro. Le contexte audio n'est créé
 * qu'après une interaction de l'utilisateur.
 */
export function createAudio(getSettings) {
  /** @type {AudioContext | null} */
  let ctx = null;
  let master = null;
  let lastClick = 0;

  function ensure() {
    const s = getSettings();
    if (!s.sound || s.volume <= 0) return null;
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try {
        ctx = new Ctor();
        master = ctx.createGain();
        master.connect(ctx.destination);
      } catch {
        ctx = null;
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    master.gain.value = 0.25 * s.volume;
    return ctx;
  }

  function tone({ freq = 440, to = freq, type = 'sine', duration = 0.12, gain = 0.6, delay = 0 }) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  return {
    /** À appeler sur la première interaction pour débloquer l'audio. */
    unlock() {
      ensure();
    },
    click() {
      const now = performance.now();
      if (now - lastClick < 45) return;
      lastClick = now;
      const f = 520 + Math.random() * 80;
      tone({ freq: f, to: f * 1.6, type: 'triangle', duration: 0.07, gain: 0.35 });
    },
    buy() {
      tone({ freq: 660, type: 'sine', duration: 0.08, gain: 0.35 });
      tone({ freq: 990, type: 'sine', duration: 0.12, gain: 0.3, delay: 0.06 });
    },
    error() {
      tone({ freq: 180, to: 140, type: 'square', duration: 0.12, gain: 0.12 });
    },
    achievement() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', duration: 0.18, gain: 0.35, delay: i * 0.07 }));
    },
    grade() {
      [392, 523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'sine', duration: 0.3, gain: 0.35, delay: i * 0.09 }));
    },
    positive() {
      tone({ freq: 440, to: 880, type: 'sine', duration: 0.25, gain: 0.35 });
    },
    negative() {
      tone({ freq: 300, to: 120, type: 'sawtooth', duration: 0.35, gain: 0.12 });
    },
    defense() {
      tone({ freq: 700, type: 'square', duration: 0.06, gain: 0.1 });
      tone({ freq: 700, type: 'square', duration: 0.06, gain: 0.1, delay: 0.1 });
    },
    tick() {
      tone({ freq: 880, type: 'sine', duration: 0.1, gain: 0.3 });
    },
    rebirth() {
      tone({ freq: 110, to: 1760, type: 'sawtooth', duration: 1.4, gain: 0.12 });
      tone({ freq: 220, to: 3520, type: 'sine', duration: 1.6, gain: 0.25, delay: 0.1 });
    },
  };
}

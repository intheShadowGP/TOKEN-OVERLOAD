/**
 * Effets visuels légers : particules sur canvas (boucle active seulement
 * tant qu'il reste des particules) et textes flottants recyclés depuis un
 * petit pool d'éléments.
 */
import { formatNumber } from '../core/numbers.js';

const COLORS = ['#3987FF', '#6F8CFF', '#9165FF', '#B9A4FF', '#F3F5FA'];
const MAX_PARTICLES = 260;

export function createParticles(canvas, { fullScreen = false } = {}) {
  const ctx = canvas.getContext('2d');
  /** @type {{x:number,y:number,vx:number,vy:number,life:number,max:number,size:number,color:string,ring?:boolean}[]} */
  const particles = [];
  let running = false;
  let last = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round((fullScreen ? window.innerWidth : rect.width) * dpr));
    const h = Math.max(1, Math.round((fullScreen ? window.innerHeight : rect.height) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.max) {
        particles.splice(i, 1);
        continue;
      }
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = k;
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - k) * dpr + 4 * dpr, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      p.vy += 260 * dt * dpr * 0.4;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * dpr * (0.4 + 0.6 * k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (particles.length) requestAnimationFrame(frame);
    else running = false;
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  return {
    resize,
    /** Gerbe de particules en coordonnées CSS relatives au canvas. */
    burst(x, y, count = 10, { speed = 260, size = 3, life = 0.8, ring = false } = {}) {
      resize();
      const px = x * dpr;
      const py = y * dpr;
      const n = Math.min(count, MAX_PARTICLES - particles.length);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.35 + Math.random() * 0.65) * dpr;
        particles.push({
          x: px,
          y: py,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - speed * 0.3 * dpr,
          life: 0,
          max: life * (0.6 + Math.random() * 0.6),
          size: size * (0.6 + Math.random() * 0.8),
          color: COLORS[(Math.random() * COLORS.length) | 0],
        });
      }
      if (ring && particles.length < MAX_PARTICLES) particles.push({ x: px, y: py, vx: 0, vy: 0, life: 0, max: 0.5, size: 60, color: '#9165FF', ring: true });
      start();
    },
    clear() {
      particles.length = 0;
    },
  };
}

/** Textes flottants (« +12 ») au-dessus du bouton, via un pool recyclé. */
export function createFloaters(layer, size = 24) {
  const pool = [];
  let index = 0;
  for (let i = 0; i < size; i++) {
    const node = document.createElement('span');
    node.className = 'float-text';
    node.hidden = true;
    node.addEventListener('animationend', () => {
      node.hidden = true;
    });
    layer.append(node);
    pool.push(node);
  }
  return {
    show(x, y, amount, { kind = '', fmt } = {}) {
      const node = pool[index];
      index = (index + 1) % pool.length;
      node.hidden = true;
      node.className = `float-text${kind ? ` is-${kind}` : ''}`;
      node.textContent = `+${formatNumber(amount, fmt)}`;
      node.style.setProperty('--x', `${Math.round(x)}px`);
      node.style.setProperty('--y', `${Math.round(y)}px`);
      node.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 40)}px`);
      // relancer l'animation sur un élément recyclé
      void node.offsetWidth;
      node.hidden = false;
    },
  };
}

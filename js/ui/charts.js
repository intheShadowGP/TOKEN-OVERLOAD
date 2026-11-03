/** Graphique de production (échelle logarithmique) dessiné sur canvas. */
import { formatDuration, formatNumber } from '../core/numbers.js';

export function drawProductionChart(canvas, history, { fmt } = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(200, Math.round(rect.width));
  const h = Math.max(120, Math.round(rect.height));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = { l: 64, r: 12, t: 12, b: 26 };
  const points = history.filter((p) => p.tps > 0);
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#929BAE';

  if (points.length < 2) {
    ctx.textAlign = 'center';
    ctx.fillText('Pas encore assez de données : un point est enregistré chaque minute de jeu.', w / 2, h / 2);
    return '';
  }

  const logs = points.map((p) => Math.log10(p.tps));
  let minY = Math.floor(Math.min(...logs));
  let maxY = Math.ceil(Math.max(...logs));
  if (maxY === minY) maxY = minY + 1;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const span = Math.max(1, t1 - t0);
  const x = (t) => pad.l + ((t - t0) / span) * (w - pad.l - pad.r);
  const y = (v) => h - pad.b - ((v - minY) / (maxY - minY)) * (h - pad.t - pad.b);

  // grille horizontale (puissances de 10)
  const step = Math.max(1, Math.ceil((maxY - minY) / 5));
  ctx.strokeStyle = 'rgba(243,245,250,0.07)';
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = minY; v <= maxY; v += step) {
    ctx.beginPath();
    ctx.moveTo(pad.l, y(v) + 0.5);
    ctx.lineTo(w - pad.r, y(v) + 0.5);
    ctx.stroke();
    ctx.fillText(`${formatNumber(10 ** v, fmt)}/s`, pad.l - 8, y(v));
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(formatDuration(t0), pad.l, h - 8);
  ctx.textAlign = 'right';
  ctx.fillText(formatDuration(t1), w - pad.r, h - 8);

  // aire et courbe
  const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
  grad.addColorStop(0, 'rgba(57,135,255,0.35)');
  grad.addColorStop(1, 'rgba(145,101,255,0)');
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(x(p.t), y(logs[i])) : ctx.moveTo(x(p.t), y(logs[i]))));
  ctx.lineTo(x(t1), h - pad.b);
  ctx.lineTo(x(t0), h - pad.b);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  const line = ctx.createLinearGradient(pad.l, 0, w - pad.r, 0);
  line.addColorStop(0, '#3987FF');
  line.addColorStop(1, '#9165FF');
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(x(p.t), y(logs[i])) : ctx.moveTo(x(p.t), y(logs[i]))));
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  return `${points.length} points · ${formatDuration(span)} de jeu`;
}

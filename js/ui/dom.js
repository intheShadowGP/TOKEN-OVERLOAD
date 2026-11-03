/**
 * Petits utilitaires DOM. Tout le texte passe par textContent : aucune
 * chaîne n'est jamais interprétée comme du HTML (compatible Trusted Types).
 */
import { iconPaths } from '../data/icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Crée un élément.
 * @param {string} tag
 * @param {{ class?: string, text?: string, attrs?: Record<string, string>, on?: Record<string, EventListener> }} [props]
 * @param {(Node | string | null | false)[]} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.text !== undefined) node.textContent = props.text;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) node.setAttribute(k, v);
  if (props.on) for (const [k, fn] of Object.entries(props.on)) node.addEventListener(k, fn);
  for (const child of children) {
    if (child === null || child === false || child === undefined) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/** Icône SVG construite élément par élément. */
export function icon(name, extraClass = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `icon ${extraClass}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  for (const d of iconPaths(name)) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/** Remplace les <span data-icon="…"> statiques du HTML par leurs icônes. */
export function hydrateIcons(root = document) {
  for (const holder of $$('[data-icon]', root)) {
    if (holder.firstChild) continue;
    holder.append(icon(holder.dataset.icon));
  }
}

/** N'écrit dans le DOM que si le texte change. */
export function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

export function setDisabled(node, disabled) {
  if (node && node.disabled !== disabled) node.disabled = disabled;
}

export function toggleClass(node, cls, on) {
  if (node && node.classList.contains(cls) !== on) node.classList.toggle(cls, on);
}

/** Barre de progression pilotée par transform (pas de reflow). */
export function setBar(node, ratio) {
  if (!node) return;
  const r = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const value = `scaleX(${r.toFixed(4)})`;
  if (node.style.transform !== value) node.style.transform = value;
}

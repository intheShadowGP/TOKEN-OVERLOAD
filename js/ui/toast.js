/** Notifications animées (succès, grades, événements, erreurs). */
import { el, icon } from './dom.js';

const MAX_VISIBLE = 4;

export function createToaster(container) {
  function dismiss(node) {
    if (node.classList.contains('is-leaving')) return;
    node.classList.add('is-leaving');
    const remove = () => node.remove();
    node.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 400); // si les animations sont désactivées
  }

  /**
   * @param {{ kind?: string, kicker?: string, title: string, text?: string, icon?: string, duration?: number }} t
   */
  function show({ kind = 'info', kicker = '', title, text = '', icon: iconName = 'info', duration = 5000 }) {
    const node = el('div', { class: `toast toast--${kind}`, attrs: { role: 'status' } }, [
      el('div', { class: 'toast__icon' }, [icon(iconName)]),
      el('div', {}, [
        kicker ? el('div', { class: 'toast__kicker', text: kicker }) : null,
        el('div', { class: 'toast__title', text: title }),
        text ? el('div', { class: 'toast__text', text }) : null,
      ]),
    ]);
    node.addEventListener('click', () => dismiss(node));
    container.append(node);
    const visible = [...container.children].filter((n) => !n.classList.contains('is-leaving'));
    if (visible.length > MAX_VISIBLE) dismiss(visible[0]);
    setTimeout(() => dismiss(node), duration);
    return node;
  }

  return { show };
}

/** Tutoriel court (5 étapes), désactivable. */

const STEPS = [
  { target: '#token-button', title: 'Cliquez ici', text: 'Chaque clic sur le token génère des tokens. Au départ : 1 token par clic.' },
  { target: '.counter', title: 'Vos tokens', text: 'Ici, vos tokens disponibles. Juste en dessous : la production par seconde, la puissance de clic et le multiplicateur global.' },
  { target: '#tab-infra', title: 'Achetez des infrastructures', text: 'Du PC du CDI à la Singularité informatique : elles produisent des tokens automatiquement, même quand vous ne cliquez pas.' },
  { target: '#grade-progress', title: 'Montez en grade', text: 'Les grades dépendent des clusters achetés et des clics depuis la dernière renaissance, et du nombre de renaissances. Chaque grade ajoute +10 % de production ; il repart de zéro à chaque renaissance.' },
  { target: '#rebirth-progress', title: 'Renaissez', text: 'Après 1 M de tokens générés dans une partie, la renaissance remet la partie à zéro contre un multiplicateur permanent ×4. Elle ne se déclenche jamais toute seule.' },
];

export function createTutorial({ onFinish }) {
  const root = document.getElementById('tutorial');
  const spot = document.getElementById('tutorial-spot');
  const card = document.getElementById('tutorial-card');
  const stepEl = document.getElementById('tutorial-step');
  const title = document.getElementById('tutorial-title');
  const text = document.getElementById('tutorial-text');
  const never = /** @type {HTMLInputElement} */ (document.getElementById('tutorial-never'));
  const next = document.getElementById('tutorial-next');
  const skip = document.getElementById('tutorial-skip');
  let index = 0;
  let active = false;

  function place() {
    const step = STEPS[index];
    const target = document.querySelector(step.target);
    if (!target) return;
    target.scrollIntoView({ block: 'nearest' });
    const r = target.getBoundingClientRect();
    const m = 8;
    spot.style.top = `${r.top - m}px`;
    spot.style.left = `${r.left - m}px`;
    spot.style.width = `${r.width + 2 * m}px`;
    spot.style.height = `${r.height + 2 * m}px`;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = r.bottom + 16;
    if (top + ch > vh - 12) top = r.top - ch - 16;
    if (top < 12) top = Math.min(vh - ch - 12, Math.max(12, r.top + 16));
    const left = Math.min(vw - cw - 16, Math.max(16, r.left + r.width / 2 - cw / 2));
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function render() {
    const step = STEPS[index];
    stepEl.textContent = `${index + 1} / ${STEPS.length}`;
    title.textContent = step.title;
    text.textContent = step.text;
    next.textContent = index === STEPS.length - 1 ? "C'est parti !" : 'Suivant';
    place();
  }

  function finish(completed) {
    if (!active) return;
    active = false;
    root.hidden = true;
    window.removeEventListener('resize', place);
    onFinish({ never: never.checked, completed });
  }

  next.addEventListener('click', () => {
    if (index < STEPS.length - 1) {
      index++;
      render();
    } else finish(true);
  });
  skip.addEventListener('click', () => finish(false));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') finish(false);
  });

  return {
    start() {
      index = 0;
      active = true;
      never.checked = false;
      root.hidden = false;
      render();
      window.addEventListener('resize', place);
      next.focus();
    },
    get active() {
      return active;
    },
  };
}

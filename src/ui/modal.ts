import { trapFocus } from './focus-trap';

export interface ModalTab {
  key: string;
  label: string;
  render: (container: HTMLElement) => void;
}

let backdropBound = false;
function ensureBackdrop(): void {
  if (backdropBound) return;
  backdropBound = true;
  const backdrop = document.getElementById('modal')!;
  // Tap on the dim backdrop (outside the modal panel) closes it.
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeModal();
  });
  // Esc closes the modal (Phase 4.4 — keyboard parity)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && backdrop.classList.contains('open')) {
      closeModal();
    }
  });
}

// Phase 4.2 — release the focus trap when the modal closes.
let releaseModalFocus: (() => void) | null = null;

export function openModal(title: string, tabs: ModalTab[] | null, defaultTab?: string): void {
  ensureBackdrop();
  const modal = document.getElementById('modal')!;
  modal.classList.add('open');
  // Phase 4.4 — modal ARIA roles
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-title');
  document.getElementById('modal-title')!.textContent = title;
  const tabsEl = document.getElementById('modal-tabs')!;
  tabsEl.setAttribute('role', 'tablist');
  tabsEl.innerHTML = '';
  if (tabs && tabs.length > 1) {
    tabs.forEach(t => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (t.key === defaultTab ? ' active' : '');
      tab.textContent = t.label;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('tabindex', '0');
      tab.setAttribute('aria-selected', t.key === defaultTab ? 'true' : 'false');
      const activate = (): void => {
        tabsEl.querySelectorAll('.tab').forEach(x => {
          x.classList.remove('active');
          x.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        t.render(document.getElementById('modal-body')!);
      };
      tab.addEventListener('click', activate);
      tab.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });
      tabsEl.appendChild(tab);
    });
  }
  const def = tabs ? tabs.find(t => t.key === defaultTab) ?? tabs[0] : null;
  if (def) def.render(document.getElementById('modal-body')!);
  // Install focus trap last so the first focusable element is in the
  // freshly rendered content.
  if (releaseModalFocus) releaseModalFocus();
  releaseModalFocus = trapFocus(modal.querySelector<HTMLElement>('.modal')!);
}

export function closeModal(): void {
  document.getElementById('modal')!.classList.remove('open');
  if (releaseModalFocus) {
    releaseModalFocus();
    releaseModalFocus = null;
  }
}

export function setBgImage(id: string, canvas: HTMLCanvasElement): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.background = `url(${canvas.toDataURL()}) center/contain no-repeat`;
  el.innerHTML = '';
}

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
}

export function openModal(title: string, tabs: ModalTab[] | null, defaultTab?: string): void {
  ensureBackdrop();
  document.getElementById('modal')!.classList.add('open');
  document.getElementById('modal-title')!.textContent = title;
  const tabsEl = document.getElementById('modal-tabs')!;
  tabsEl.innerHTML = '';
  if (tabs && tabs.length > 1) {
    tabs.forEach(t => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (t.key === defaultTab ? ' active' : '');
      tab.textContent = t.label;
      tab.addEventListener('click', () => {
        tabsEl.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        tab.classList.add('active');
        t.render(document.getElementById('modal-body')!);
      });
      tabsEl.appendChild(tab);
    });
  }
  const def = tabs ? tabs.find(t => t.key === defaultTab) ?? tabs[0] : null;
  if (def) def.render(document.getElementById('modal-body')!);
}

export function closeModal(): void {
  document.getElementById('modal')!.classList.remove('open');
}

export function setBgImage(id: string, canvas: HTMLCanvasElement): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.background = `url(${canvas.toDataURL()}) center/contain no-repeat`;
  el.innerHTML = '';
}

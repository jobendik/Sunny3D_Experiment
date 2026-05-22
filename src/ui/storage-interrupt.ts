// =============================================================
//  STORAGE INTERRUPT UI — cozy non-blocking prompt.
//  Surfaces only on rising-edge over-capacity; offers Upgrade
//  (routes to storage-upgrade panel) or Open Barn (sell).
// =============================================================

import { state } from '../state';
import {
  shouldShowStorageInterrupt, markStorageInterruptShown, markStorageInterruptDismissed,
} from '../systems/storage-interrupt';
import { siloUsage, barnUsage } from '../systems/storage';
import { sfx } from '../audio/sfx';

let modalEl: HTMLElement | null = null;
let bound = false;

function ensureModal(): HTMLElement {
  if (modalEl) return modalEl;
  const el = document.createElement('div');
  el.id = 'storage-interrupt';
  el.className = 'storage-interrupt';
  el.setAttribute('hidden', '');
  el.innerHTML = `
    <div class="storage-interrupt-card">
      <div class="storage-interrupt-icon" aria-hidden="true">📦</div>
      <h3 class="storage-interrupt-title">Storage is full!</h3>
      <p class="storage-interrupt-body" id="storage-interrupt-body">
        Your barn and silo are over capacity. Sell some items to
        free space, or upgrade your storage.
      </p>
      <div class="storage-interrupt-actions">
        <button class="storage-interrupt-btn primary" id="storage-interrupt-upgrade">
          🔧 Upgrade Storage
        </button>
        <button class="storage-interrupt-btn" id="storage-interrupt-barn">
          📦 Open Barn
        </button>
      </div>
      <button class="storage-interrupt-close" id="storage-interrupt-close" aria-label="Dismiss">×</button>
    </div>
  `;
  document.getElementById('game-root')?.appendChild(el);
  modalEl = el;
  return el;
}

function bind(): void {
  if (bound) return;
  bound = true;
  ensureModal();
  document.getElementById('storage-interrupt-close')?.addEventListener('click', () => {
    hide();
    markStorageInterruptDismissed();
    sfx.click();
  });
  document.getElementById('storage-interrupt-upgrade')?.addEventListener('click', () => {
    hide();
    markStorageInterruptDismissed();
    // The Inventory panel hosts barn/silo upgrade tabs.
    document.getElementById('open-inventory')?.click();
    sfx.click();
  });
  document.getElementById('storage-interrupt-barn')?.addEventListener('click', () => {
    hide();
    markStorageInterruptDismissed();
    document.getElementById('open-inventory')?.click();
    sfx.click();
  });
}

function show(): void {
  const m = ensureModal();
  bind();
  const su = siloUsage();
  const bu = barnUsage();
  const body = document.getElementById('storage-interrupt-body');
  if (body) {
    const parts: string[] = [];
    if (su.used > su.cap) parts.push(`Silo: ${su.used}/${su.cap}`);
    if (bu.used > bu.cap) parts.push(`Barn: ${bu.used}/${bu.cap}`);
    body.innerHTML = `
      ${parts.join(' · ')}<br/>
      Free space by selling items, or upgrade your storage to keep harvesting.
    `;
  }
  m.removeAttribute('hidden');
  m.classList.add('storage-interrupt--in');
}

function hide(): void {
  const m = modalEl;
  if (!m) return;
  m.classList.remove('storage-interrupt--in');
  m.setAttribute('hidden', '');
}

/** Called every UI tick. Cheap: just polls the rising-edge gate. */
export function maybeShowStorageInterrupt(): void {
  if (!state.storage) return;
  if (shouldShowStorageInterrupt()) {
    show();
    markStorageInterruptShown();
  }
}

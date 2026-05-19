// =============================================================
//  SNAPSHOT PANEL — render a sharable postcard image.
// =============================================================

import { state } from '../state';
import { buildSnapshot, copySnapshotImage, downloadSnapshot } from '../systems/snapshot';
import { openModal } from './modal';
import { toast } from './toasts';

export function openSnapshot(): void {
  openModal('🖼️ Farm Snapshot', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  render(body);
}

function render(body: HTMLElement): void {
  const snap = buildSnapshot();
  body.innerHTML = `
    <div class="snapshot-wrap">
      <img src="${snap.url}" width="${snap.width}" height="${snap.height}" class="snapshot-img">
    </div>
    <div class="snapshot-form">
      <label>Farm Name:
        <input type="text" id="farm-name" value="${state.farmName ?? 'Sunny Acres'}" maxlength="24">
      </label>
      <button id="save-name" class="btn">Update</button>
    </div>
    <div class="snapshot-actions">
      <button class="btn primary" id="copy-snap">📋 Copy</button>
      <button class="btn" id="dl-snap">⬇️ Download</button>
    </div>
  `;
  document.getElementById('save-name')!.addEventListener('click', () => {
    const el = document.getElementById('farm-name') as HTMLInputElement;
    state.farmName = (el.value || 'Sunny Acres').trim();
    render(body);
  });
  document.getElementById('copy-snap')!.addEventListener('click', async () => {
    const ok = await copySnapshotImage();
    toast(ok ? 'Copied to clipboard!' : 'Use Download instead', ok ? 'gold' : '');
  });
  document.getElementById('dl-snap')!.addEventListener('click', () => downloadSnapshot());
}

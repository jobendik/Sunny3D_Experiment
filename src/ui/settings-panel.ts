// =============================================================
//  SETTINGS PANEL — accessibility, family safety, scenic mode.
// =============================================================

import { state } from '../state';
import { openModal } from './modal';
import { initSettings, toggleSetting, setScenicMode } from '../systems/settings';
import { closeModal } from './modal';

export function openSettingsPanel(): void {
  initSettings();
  openModal('⚙️ Settings', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(document.getElementById('modal-body')!);
}

interface SettingDef {
  key: keyof NonNullable<typeof state.settings>;
  label: string;
  icon: string;
  description: string;
}

const SETTING_DEFS: SettingDef[] = [
  { key: 'reducedMotion',
    label: 'Reduce Motion',
    icon: '🌀',
    description: 'Slow or disable non-essential animations (parallax, sheen, idle wiggles).' },
  { key: 'largeText',
    label: 'Larger Text',
    icon: '🔤',
    description: 'Boost the base font size for easier reading.' },
  { key: 'highContrast',
    label: 'High Contrast',
    icon: '🟨',
    description: 'Heavier outlines and bolder colours on labels and panels.' },
  { key: 'familyFriendly',
    label: 'Family-Friendly Mode',
    icon: '🛡️',
    description: 'Friendlier visitor labels and lighter visual effects. Recommended for young players.' },
  { key: 'hapticOn',
    label: 'Vibration Feedback',
    icon: '📳',
    description: 'Brief vibrations on important taps (mobile only).' },
];

function render(body: HTMLElement): void {
  const s = state.settings!;
  let html = `
    <p class="settings-intro">
      Customize how Sunny Acres looks, sounds and feels.
    </p>
    <div class="settings-list">
  `;
  for (const def of SETTING_DEFS) {
    const on = !!s[def.key];
    html += `
      <label class="settings-row" data-setting="${def.key}">
        <span class="settings-icon" aria-hidden="true">${def.icon}</span>
        <span class="settings-text">
          <span class="settings-label">${def.label}</span>
          <span class="settings-desc">${def.description}</span>
        </span>
        <span class="settings-toggle ${on ? 'is-on' : ''}" role="switch" aria-checked="${on}" tabindex="0">
          <span class="settings-toggle-dot"></span>
        </span>
      </label>
    `;
  }
  html += `</div>
    <div class="settings-actions">
      <button class="btn primary big" id="enter-scenic">🌅 Enter Scenic Mode</button>
      <p class="settings-fineprint">Scenic Mode hides the HUD so you can admire the farm. Tap anywhere to exit.</p>
    </div>
  `;

  body.innerHTML = html;

  body.querySelectorAll<HTMLElement>('.settings-row').forEach(row => {
    const key = row.dataset.setting as keyof NonNullable<typeof state.settings>;
    const onActivate = () => {
      toggleSetting(key);
      render(body);
    };
    row.addEventListener('click', onActivate);
    row.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onActivate();
      }
    });
  });

  const scenicBtn = document.getElementById('enter-scenic');
  if (scenicBtn) {
    scenicBtn.addEventListener('click', () => {
      setScenicMode(true);
      closeModal();
    });
  }
}

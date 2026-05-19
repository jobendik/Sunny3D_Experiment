// =============================================================
//  WHEEL PANEL — daily free spin with satisfying animation.
// =============================================================

import { state } from '../state';
import { getSlices, canSpin, spinWheel, applySpinResult, initWheel } from '../systems/wheel';
import { openModal } from './modal';
import { sfx } from '../audio/sfx';

let spinningTimer: number | null = null;

export function openWheel(): void {
  initWheel();
  openModal('🎡 Daily Wheel', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(document.getElementById('modal-body')!);
}

function render(body: HTMLElement): void {
  const slices = getSlices();
  const canSpinNow = canSpin();
  const wheel = state.wheel!;

  const startAngle = -Math.PI / 2;
  const total = slices.reduce((a, s) => a + s.weight, 0);
  let a = startAngle;
  const wedges: string[] = [];
  const labels: string[] = [];
  slices.forEach((s, i) => {
    const span = (s.weight / total) * Math.PI * 2;
    const x1 = 50 + Math.cos(a) * 50;
    const y1 = 50 + Math.sin(a) * 50;
    const x2 = 50 + Math.cos(a + span) * 50;
    const y2 = 50 + Math.sin(a + span) * 50;
    const large = span > Math.PI ? 1 : 0;
    wedges.push(`<path d="M50,50 L${x1},${y1} A50,50 0 ${large} 1 ${x2},${y2} Z" fill="${s.color}" stroke="#fff" stroke-width="0.6"/>`);
    const lx = 50 + Math.cos(a + span / 2) * 28;
    const ly = 50 + Math.sin(a + span / 2) * 28;
    labels.push(`<text x="${lx}" y="${ly}" text-anchor="middle" font-size="4.5" font-weight="bold" fill="#3a2410" dy="1.5">${s.label}</text>`);
    a += span;
  });

  body.innerHTML = `
    <div class="wheel-wrap">
      <div class="wheel-pointer">▼</div>
      <svg viewBox="0 0 100 100" class="wheel-svg" id="wheel-svg">
        <g id="wheel-g" transform="rotate(0 50 50)">
          ${wedges.join('')}
          ${labels.join('')}
        </g>
        <circle cx="50" cy="50" r="6" fill="#c8961d" stroke="#fff" stroke-width="1"/>
        <circle cx="50" cy="50" r="3" fill="#fff"/>
      </svg>
    </div>
    <div class="wheel-actions">
      <button id="wheel-spin" class="btn primary" ${canSpinNow ? '' : 'disabled'}>
        ${canSpinNow ? 'SPIN!' : 'Come back tomorrow'}
      </button>
    </div>
    <p style="font-size:11px;color:#666;text-align:center;margin-top:8px">One free spin per day. JACKPOT and Treasure tiers exist!</p>
  `;
  document.getElementById('wheel-spin')!.addEventListener('click', () => {
    if (!canSpin()) return;
    const result = spinWheel();
    if (result === null) return;
    sfx.click();
    // Land on the chosen wedge after several full rotations.
    const total2 = slices.reduce((a, s) => a + s.weight, 0);
    let target = 0;
    let accAng = 0;
    for (let i = 0; i < slices.length; i++) {
      const span = (slices[i]!.weight / total2) * 360;
      if (i === result) { target = accAng + span / 2; break; }
      accAng += span;
    }
    const final = 360 * 5 + (270 - target); // pointer at top
    const g = document.getElementById('wheel-g') as unknown as SVGGElement;
    g.style.transition = 'transform 3.4s cubic-bezier(0.16, 1, 0.3, 1)';
    g.style.transform = `rotate(${final}deg)`;
    const btn = document.getElementById('wheel-spin') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Spinning…';
    if (spinningTimer !== null) clearTimeout(spinningTimer);
    spinningTimer = window.setTimeout(() => {
      applySpinResult();
      render(body);
    }, 3500);
  });
}

// =============================================================
//  WHEEL PANEL — daily free spin with satisfying animation.
//  Labels are rotated along the wedge angle so adjacent slices
//  don't overlap, and the viewBox has padding so a wide spin
//  shadow can't clip against the modal body.
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

function shortLabel(raw: string): string {
  // Keep labels punchy so a narrow wedge can still hold them.
  // The wheel system labels are already short, but we strip leading
  // "+" and combine ico into one chunk for readability.
  return raw.replace(/^\+/, '').trim();
}

function render(body: HTMLElement): void {
  const slices = getSlices();
  const canSpinNow = canSpin();

  // SVG geometry — 100×100 wheel inside a 120×120 viewBox so labels
  // and the drop-shadow can extend beyond the disc without clipping.
  const cx = 50, cy = 50, r = 48;
  const startAngle = -Math.PI / 2;
  const total = slices.reduce((acc, s) => acc + s.weight, 0);
  let a = startAngle;
  const wedges: string[] = [];
  const labels: string[] = [];

  slices.forEach((s) => {
    const span = (s.weight / total) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * r;
    const y1 = cy + Math.sin(a) * r;
    const x2 = cx + Math.cos(a + span) * r;
    const y2 = cy + Math.sin(a + span) * r;
    const large = span > Math.PI ? 1 : 0;
    wedges.push(
      `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z"
             fill="${s.color}" stroke="#fff" stroke-width="0.7"
             stroke-linejoin="round"/>`,
    );
    // Label position: 65% out from center, rotated so the baseline
    // follows the wedge bisector. Flip text 180° if it would read
    // upside-down (right half of the wheel).
    const mid = a + span / 2;
    const lx = cx + Math.cos(mid) * r * 0.65;
    const ly = cy + Math.sin(mid) * r * 0.65;
    let deg = (mid * 180) / Math.PI + 90;
    // Normalize so text stays right-reading. If the wedge sits on
    // the right half (cos(mid) > 0 with normalized angle), flip 180°.
    const norm = ((deg % 360) + 360) % 360;
    if (norm > 90 && norm < 270) deg += 180;
    const lbl = shortLabel(s.label);
    labels.push(
      `<g transform="translate(${lx} ${ly}) rotate(${deg})">
         <text x="0" y="2" text-anchor="middle"
               font-family="'Fredoka', system-ui, sans-serif"
               font-size="5" font-weight="700"
               fill="#3a2410"
               style="paint-order: stroke fill;
                      stroke: rgba(255,255,255,0.85);
                      stroke-width: 1.4;
                      stroke-linejoin: round;">${escapeXml(lbl)}</text>
       </g>`,
    );
    a += span;
  });

  body.innerHTML = `
    <div class="wheel-wrap">
      <div class="wheel-pointer" aria-hidden="true">▼</div>
      <svg viewBox="-10 -10 120 120" class="wheel-svg"
           preserveAspectRatio="xMidYMid meet" role="img"
           aria-label="Daily reward wheel">
        <defs>
          <radialGradient id="wheel-rim" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.82" stop-color="rgba(0,0,0,0)"/>
            <stop offset="1" stop-color="rgba(94, 60, 20, 0.45)"/>
          </radialGradient>
        </defs>
        <circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="#fff8e8" stroke="#c8861d" stroke-width="2"/>
        <g id="wheel-g" transform="rotate(0 ${cx} ${cy})">
          ${wedges.join('')}
          ${labels.join('')}
        </g>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#wheel-rim)" pointer-events="none"/>
        <circle cx="${cx}" cy="${cy}" r="7" fill="#c8961d" stroke="#fff" stroke-width="1.2"/>
        <circle cx="${cx}" cy="${cy}" r="3" fill="#fff"/>
      </svg>
    </div>
    <div class="wheel-actions">
      <button id="wheel-spin" class="btn primary wheel-spin-btn" ${canSpinNow ? '' : 'disabled'}>
        <span class="wheel-spin-label">${canSpinNow ? 'SPIN!' : 'Come back tomorrow'}</span>
      </button>
    </div>
    <p class="wheel-fineprint">One free spin per day. JACKPOT and Treasure tiers exist!</p>
  `;

  document.getElementById('wheel-spin')!.addEventListener('click', () => {
    if (!canSpin()) return;
    const result = spinWheel();
    if (result === null) return;
    sfx.click();

    // Land on the chosen wedge after several full rotations. The wheel
    // group rotates clockwise (positive degrees), and the pointer sits
    // at the top (270° / -90°). Compute the wedge's centre, then offset
    // so it ends up under the pointer.
    let target = 0;
    let acc = 0;
    for (let i = 0; i < slices.length; i++) {
      const span = (slices[i]!.weight / total) * 360;
      if (i === result) { target = acc + span / 2; break; }
      acc += span;
    }
    const final = 360 * 5 + (270 - target);
    const g = document.getElementById('wheel-g') as unknown as SVGGElement | null;
    if (!g) return;
    g.style.transition = 'transform 3.4s cubic-bezier(0.16, 1, 0.3, 1)';
    g.style.transform = `rotate(${final}deg)`;

    const btn = document.getElementById('wheel-spin') as HTMLButtonElement;
    btn.disabled = true;
    btn.classList.add('is-spinning');
    const lbl = btn.querySelector<HTMLElement>('.wheel-spin-label');
    if (lbl) lbl.textContent = 'Spinning…';

    if (spinningTimer !== null) clearTimeout(spinningTimer);
    spinningTimer = window.setTimeout(() => {
      applySpinResult();
      render(body);
    }, 3500);
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

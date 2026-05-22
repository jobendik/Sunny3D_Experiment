// =============================================================
//  SANCTUARY PANEL — wildlife sightings book.
// =============================================================

import { state } from '../state';
import { openModal } from './modal';
import { SPECIES, initSanctuary, discoveredCount, activeVisitor, observeActive, sightingFor } from '../systems/sanctuary';
import { updateHUD } from './hud';

export function openSanctuaryPanel(): void {
  initSanctuary();
  openModal('📖 Sanctuary Book', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(document.getElementById('modal-body')!);
}

function render(body: HTMLElement): void {
  const total = SPECIES.length;
  const found = discoveredCount();
  const visitor = activeVisitor();

  let html = `
    <p class="sanctuary-blurb">
      A quiet log of wild visitors. Tap a species in the world to record
      a sighting. Some species are very rare — be patient!
    </p>
    <div class="sanctuary-stats">
      <b>${found}</b> / ${total} species discovered
      <div class="sanctuary-bar"><div class="sanctuary-bar-fill" style="width:${(found / total) * 100}%"></div></div>
    </div>
  `;

  if (visitor) {
    html += `
      <div class="sanctuary-visitor-card">
        <div class="sanctuary-visitor-icon">${visitor.species.emoji}</div>
        <div class="sanctuary-visitor-text">
          <b>${visitor.species.name}</b> is here right now!
          <div><small>Habitat: ${visitor.species.habitat}</small></div>
        </div>
        <button class="btn primary" id="observe-now">Observe ✨</button>
      </div>
    `;
  } else {
    html += `<div class="sanctuary-quiet">🌾 No wildlife visible right now. Keep playing — they come and go.</div>`;
  }

  // Categories
  const cats = ['bird', 'mammal', 'reptile', 'insect', 'mythic'] as const;
  for (const cat of cats) {
    const list = SPECIES.filter(s => s.category === cat);
    if (list.length === 0) continue;
    html += `<h3 class="sanctuary-cat-title">${categoryEmoji(cat)} ${categoryLabel(cat)}</h3>`;
    html += '<div class="sanctuary-grid">';
    for (const sp of list) {
      const sight = sightingFor(sp.id);
      const known = !!sight;
      html += `
        <div class="sanctuary-card ${known ? 'is-known' : 'is-unknown'}">
          <div class="sanctuary-card-icon" aria-hidden="true">${known ? sp.emoji : '❓'}</div>
          <div class="sanctuary-card-name">${known ? sp.name : '???'}</div>
          <div class="sanctuary-card-rarity">${'★'.repeat(sp.rarity)}</div>
          ${known && sight ? `<div class="sanctuary-card-count">×${sight.count}</div>` : ''}
          ${known ? `<div class="sanctuary-card-desc">${sp.description}</div>` : ''}
        </div>
      `;
    }
    html += '</div>';
  }

  body.innerHTML = html;

  const obsBtn = document.getElementById('observe-now');
  if (obsBtn) {
    obsBtn.addEventListener('click', () => {
      if (observeActive()) {
        updateHUD();
        render(body);
      }
    });
  }
}

function categoryEmoji(c: string): string {
  switch (c) {
    case 'bird': return '🐦';
    case 'mammal': return '🦊';
    case 'reptile': return '🐢';
    case 'insect': return '🦋';
    case 'mythic': return '✨';
    default: return '🌿';
  }
}
function categoryLabel(c: string): string {
  switch (c) {
    case 'bird': return 'Birds';
    case 'mammal': return 'Mammals';
    case 'reptile': return 'Reptiles & Amphibians';
    case 'insect': return 'Insects';
    case 'mythic': return 'Mythic';
    default: return c;
  }
}

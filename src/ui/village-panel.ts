// =============================================================
//  VILLAGE PANEL — visit the small village hub and its nodes.
// =============================================================

import { openModal } from './modal';
import { initVillage, VILLAGE_NODES, visitNode, isNodeUnlocked, isNodeVisitedToday, reputationTierProgress } from '../systems/village';
import { lazy } from './lazy-panels';

const lazyGazette = lazy(() => import('./gazette-panel'));
const lazyBoat = lazy(() => import('./boat-panel'));
const lazyTrain = lazy(() => import('./train-panel'));
const lazyLandmark = lazy(() => import('./landmark-panel'));
const lazyFriendship = lazy(() => import('./friendship-panel'));
const lazyMarketStall = lazy(() => import('./market-stall-panel'));
const lazyWeatherGrid = lazy(() => import('./weather-grid-panel'));
const lazyClub = lazy(() => import('./club-panel'));

const openGazette = (): void => lazyGazette.call('openGazette');
const openBoatPanel = (): void => lazyBoat.call('openBoatPanel');
const openTrainPanel = (): void => lazyTrain.call('openTrainPanel');
const openLandmarkPanel = (): void => lazyLandmark.call('openLandmarkPanel');
const openFriendshipPanel = (): void => lazyFriendship.call('openFriendshipPanel');
const openMarketStall = (): void => lazyMarketStall.call('openMarketStall');
const openWeatherGrid = (): void => lazyWeatherGrid.call('openWeatherGrid');
const openClubPanel = (): void => lazyClub.call('openClubPanel');

export function openVillagePanel(): void {
  initVillage();
  openModal('🏘️ Sunny Village', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render();
}

function panelFor(key: string): () => void {
  switch (key) {
    case 'gazette':     return openGazette;
    case 'boat':        return openBoatPanel;
    case 'train':       return openTrainPanel;
    case 'landmark':    return openLandmarkPanel;
    case 'friendship':  return openFriendshipPanel;
    case 'stall':       return openMarketStall;
    case 'weather-grid': return openWeatherGrid;
    case 'club':        return openClubPanel;
    default:            return () => {};
  }
}

function render(): void {
  const body = document.getElementById('modal-body')!;
  const t = reputationTierProgress();
  const nodes = Object.keys(VILLAGE_NODES).map(id => {
    const n = VILLAGE_NODES[id]!;
    const unlocked = isNodeUnlocked(id);
    const visited = isNodeVisitedToday(id);
    return `
      <button class="sheet-btn" data-node="${id}" ${unlocked ? '' : 'disabled'} style="position:relative">
        <span class="ico-emoji" style="font-size:24px">${n.emoji}</span>
        <span style="font-weight:600">${n.name}</span>
        <small>${unlocked ? n.blurb : `Lv ${n.unlockLevel}`}</small>
        ${visited ? '<span style="position:absolute;top:6px;right:6px;font-size:12px">✓</span>' : ''}
      </button>`;
  }).join('');
  body.innerHTML = `
    <div style="padding:8px 0 12px">
      <p style="margin:0"><b>Village Reputation: ${t.name}</b>${t.next ? ` · next: ${t.next}` : ''}</p>
      <div class="landmark-bar"><div class="landmark-fill" style="width:${t.pct}%"></div></div>
    </div>
    <div class="bottom-sheet-grid" style="position:relative">${nodes}</div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-node]').forEach(btn =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.node!;
      const result = visitNode(id);
      if (result.opensPanel) panelFor(result.opensPanel)();
      else render();
    }),
  );
}

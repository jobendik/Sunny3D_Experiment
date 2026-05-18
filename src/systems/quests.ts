import { state } from '../state';
import { SW, SH } from '../canvas';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { randi, choice } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { spawnParticles } from './particles';
import { addXP } from './xp';
import { checkAchievements } from './achievements';
import type { Quest, QuestKind } from '../types';

export function generateQuest(level: number): Quest {
  const types: Quest[] = [];

  const harvestCrops = Object.keys(CROPS).filter(k => CROPS[k]!.level <= level);
  if (harvestCrops.length) {
    const k = choice(harvestCrops);
    const target = 5 + randi(15) + level * 2;
    types.push({
      id: 'h' + Date.now() + randi(1e6),
      kind: 'harvest', item: k, target, progress: 0,
      desc: `Harvest ${target} ${ITEMS[CROPS[k]!.item]!.name}`,
      reward: { coins: target * 3 + level * 8, xp: Math.max(2, Math.floor(target / 3)) },
    });
  }

  const sellable = Object.keys(ITEMS).filter(k => ITEMS[k]!.level <= level && k !== 'feed' && ITEMS[k]!.sell > 5);
  if (sellable.length) {
    const k = choice(sellable);
    const target = 3 + randi(10) + level;
    types.push({
      id: 's' + Date.now() + randi(1e6),
      kind: 'sell', item: k, target, progress: 0,
      desc: `Sell ${target} ${ITEMS[k]!.name}`,
      reward: { coins: target * 5 + level * 10, xp: Math.max(2, Math.floor(target / 2)) },
    });
  }

  if (level >= 3) {
    const items = ['flour', 'bread', 'feed', 'cookie', 'butter', 'cheese', 'juice', 'jam', 'sugar', 'cake', 'ribs', 'pie', 'cloth']
      .filter(k => ITEMS[k] && ITEMS[k]!.level <= level);
    if (items.length) {
      const k = choice(items);
      const target = 2 + randi(5) + Math.floor(level / 2);
      types.push({
        id: 'p' + Date.now() + randi(1e6),
        kind: 'produce', item: k, target, progress: 0,
        desc: `Produce ${target} ${ITEMS[k]!.name}`,
        reward: { coins: target * 12 + level * 10, xp: Math.max(3, target * 2) },
      });
    }
  }

  if (level >= 2) {
    const target = 200 + randi(500) + level * 80;
    types.push({
      id: 'c' + Date.now() + randi(1e6),
      kind: 'earn', target, progress: 0,
      desc: `Earn ${target} coins`,
      reward: { coins: Math.floor(target * 0.2), xp: Math.max(4, Math.floor(target / 40)) },
    });
  }

  if (level >= 3) {
    const target = 2 + randi(3) + Math.floor(level / 3);
    types.push({
      id: 'o' + Date.now() + randi(1e6),
      kind: 'orders', target, progress: 0,
      desc: `Fulfill ${target} truck orders`,
      reward: { coins: target * 60 + level * 15, xp: target * 5 },
    });
  }

  if (level >= 3) {
    const target = 1 + randi(5) + Math.floor(level / 2);
    types.push({
      id: 'f' + Date.now() + randi(1e6),
      kind: 'fish', target, progress: 0,
      desc: `Catch ${target} fish`,
      reward: { coins: target * 20 + 30, xp: target * 4 },
    });
  }

  return choice(types);
}

export function refillQuests(): void {
  while (state.quests.length < 3) {
    state.quests.push(generateQuest(state.level));
  }
  renderQuests();
}

export function questProgress(kind: QuestKind, item: string | null, amt = 1): void {
  let changed = false;
  for (const q of state.quests) {
    if (q.complete) continue;
    if (q.kind === kind && (!q.item || q.item === item)) {
      q.progress += amt;
      if (q.progress >= q.target) {
        q.progress = q.target;
        q.complete = true;
      }
      changed = true;
    }
  }
  if (changed) renderQuests();
}

export function claimQuest(qid: string): void {
  const idx = state.quests.findIndex(q => q.id === qid);
  if (idx < 0) return;
  const q = state.quests[idx]!;
  if (!q.complete) return;
  state.coins += q.reward.coins;
  addXP(q.reward.xp);
  state.stats.questsDone++;
  state.stats.earned += q.reward.coins;
  sfx.quest(); sfx.coin();
  spawnParticles(SW() / 2, SH() / 2, '#ffd040', 30, true);
  showQuestBurst('Quest Complete!');
  toast(`Quest done: +${q.reward.coins} 💰 +${q.reward.xp} XP`, 'gold');
  state.quests.splice(idx, 1);
  setTimeout(() => refillQuests(), 400);
  updateHUD();
  checkAchievements();
}

export function renderQuests(): void {
  const list = document.getElementById('quests-list');
  if (!list) return;
  list.innerHTML = '';
  for (const q of state.quests) {
    const pct = Math.min(100, (q.progress / q.target) * 100);
    const card = document.createElement('div');
    card.className = 'quest-card' + (q.complete ? ' complete' : '');
    card.innerHTML = `
      <div class="qdesc">${q.desc}</div>
      <div class="qbar"><div class="qfill" style="width:${pct}%"></div></div>
      <div class="qreward">
        <span>${q.progress}/${q.target}</span>
        <span>•</span>
        <img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">+${q.reward.coins}
        <img class="ico-mini" src="${sprites.item.xp!.toDataURL()}">+${q.reward.xp}
      </div>
      ${q.complete ? `<button class="qclaim" data-qid="${q.id}">Claim Reward!</button>` : ''}
    `;
    list.appendChild(card);
  }
  list.querySelectorAll<HTMLButtonElement>('button[data-qid]').forEach(btn =>
    btn.addEventListener('click', () => claimQuest(btn.dataset.qid!))
  );
}

export function showQuestBurst(text: string): void {
  const el = document.getElementById('quest-burst');
  if (!el) return;
  el.textContent = '★ ' + text + ' ★';
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

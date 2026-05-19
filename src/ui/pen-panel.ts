import { state } from '../state';
import { TILE } from '../constants';
import { ANIMALS } from '../data/animals';
import { BUILDINGS } from '../data/buildings';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { rand, nowSeconds } from '../utils';
import { sfx } from '../audio/sfx';
import { openModal } from './modal';
import { toast } from './toasts';
import { updateHUD } from './hud';
import { addItem } from '../systems/inventory';
import { addXP } from '../systems/xp';
import { feedPen, penFeedLevel } from '../systems/pens';
import { questProgress } from '../systems/quests';
import { dailyChallengeProgress } from '../systems/daily';
import { addWeeklyPoints, currentTheme } from '../systems/weekly';
import { checkAchievements } from '../systems/achievements';
import { floatText } from '../systems/particles';
import { moodLevel, moodMultipliers } from '../systems/animal-mood';
import { specEffects } from '../systems/specializations';
import type { BuildingInstance } from '../types';

export function openPenPanel(b: BuildingInstance): void {
  const def = BUILDINGS[b.type]!;
  const aniDef = ANIMALS[def.animal!]!;
  const animals = state.penAnimals[b.id] ?? (state.penAnimals[b.id] = []);
  if (state.penFeed[b.id] === undefined) state.penFeed[b.id] = 100;

  openModal(def.name, null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;

  function render(): void {
    const feedPct = penFeedLevel(b.id);
    const isHungry = feedPct < 20;
    const mood = moodLevel(b.id);
    const mm = moodMultipliers(b.id);
    const sp = specEffects();
    const effectiveTime = aniDef.produceTime / mm.speed / (1 + (sp.animalSpeed ?? 0));
    const slots: string[] = [];
    for (let i = 0; i < def.capacity!; i++) {
      const a = animals[i];
      if (a) {
        const elapsed = nowSeconds() - a.lastProduced;
        const ready = elapsed >= effectiveTime;
        const pct = Math.min(100, (elapsed / effectiveTime) * 100);
        slots.push(`
          <div class="shop-item">
            <img class="ico" src="${sprites.animal[def.animal!]![0]!.toDataURL()}">
            <div class="name">${aniDef.name}${isHungry ? ' 😟' : ''}</div>
            <div style="width:100%;height:8px;background:#efe2c0;border-radius:4px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${ready ? '#6abf4b' : '#7ac0ef'}"></div>
            </div>
            <button ${ready && !isHungry ? '' : 'disabled'} data-act="collect" data-idx="${i}">${
              isHungry ? 'Too hungry!' :
              ready ? 'Collect ' + ITEMS[aniDef.produces]!.name :
              'Growing... ' + Math.ceil(effectiveTime - elapsed) + 's'
            }</button>
          </div>
        `);
      } else {
        slots.push(`
          <div class="shop-item">
            <div style="opacity:0.4;font-size:60px">+</div>
            <div class="name">Empty slot</div>
            <div class="price"><img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${aniDef.price}</div>
            <button data-act="buy">Buy ${aniDef.name}</button>
          </div>
        `);
      }
    }
    body.innerHTML = `
      <div style="font-size:13px;margin-bottom:6px;color:#666">
        Animals produce ${ITEMS[aniDef.produces]!.name} every ${effectiveTime.toFixed(0)}s (base ${aniDef.produceTime}s).
        Capacity: ${animals.length}/${def.capacity}
      </div>
      <div class="mood-bar-wrap">
        <span style="font-size:12px;font-weight:bold">Mood: ${Math.floor(mood)}/100</span>
        <div class="mood-bar"><div class="mood-bar-fill" style="width:${mood}%"></div></div>
        <span style="font-size:11px;color:#666">Yield ×${mm.yield.toFixed(2)} · Speed ×${mm.speed.toFixed(2)}</span>
      </div>
      <div style="background:#fff;border:2px solid var(--panel-edge);border-radius:8px;padding:8px;margin-bottom:8px;display:flex;align-items:center;gap:8px">
        <img class="ico-mini" src="${sprites.item.feed!.toDataURL()}">
        <div style="flex:1">
          <div style="font-size:12px;color:#5a3d0c;font-weight:bold">Feed: ${Math.floor(feedPct)}%</div>
          <div class="feed-bar"><div class="feed-bar-fill ${isHungry ? 'low' : ''}" style="width:${feedPct}%"></div></div>
        </div>
        <button data-act="feed" style="background:var(--green-btn);color:white;border:none;border-radius:6px;padding:6px 12px;font-weight:bold;cursor:pointer">Feed</button>
        <span style="font-size:11px;color:#888">have: ${state.inv.feed ?? 0}</span>
      </div>
      ${isHungry ? '<div style="color:#d24a4a;font-size:12px;margin-bottom:6px;text-align:center">⚠️ Animals are too hungry to produce. Feed them!</div>' : ''}
      <div class="shop-grid">${slots.join('')}</div>
    `;
    body.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'feed') {
          feedPen(b.id, 10);
          render();
        } else if (act === 'buy') {
          if (state.coins < aniDef.price) {
            sfx.cantAfford();
            toast('Not enough coins!', 'error');
            return;
          }
          if (animals.length >= def.capacity!) return;
          state.coins -= aniDef.price;
          state.stats.animalsOwned += 1;
          // Random breed trait roll: 70% common, 20% prized, 10% champion
          const r = Math.random();
          const trait = r < 0.10 ? 'champion' : (r < 0.30 ? 'prized' : 'common');
          if (trait !== 'common') {
            toast(`A ${trait} ${aniDef.name}!`, 'gold');
          }
          animals.push({
            kind: def.animal!,
            lastProduced: nowSeconds(),
            ax: rand(def.w * TILE - 40) + 20,
            ay: rand(def.h * TILE - 40) + 20,
            tx: rand(def.w * TILE - 40) + 20,
            ty: rand(def.h * TILE - 40) + 20,
            frameT: rand(2),
            frame: 0,
          });
          sfx.coin();
          toast(`Got a ${aniDef.name}!`);
          updateHUD();
          checkAchievements();
          render();
        } else if (act === 'collect') {
          const idx = parseInt(btn.dataset.idx!, 10);
          const a = animals[idx]!;
          const elapsed = nowSeconds() - a.lastProduced;
          if (elapsed < effectiveTime) return;
          if (isHungry) { toast('Animals too hungry!', 'error'); return; }
          const yieldAmt = Math.max(1, Math.round(1 * mm.yield * (1 + (sp.animalYield ?? 0))));
          addItem(aniDef.produces, yieldAmt);
          addXP(aniDef.xp);
          state.stats.produced++;
          state.stats.itemsProduced[aniDef.produces] = (state.stats.itemsProduced[aniDef.produces] ?? 0) + yieldAmt;
          a.lastProduced = nowSeconds();
          sfx.harvest();
          floatText(
            b.x * TILE + def.w * TILE / 2,
            b.y * TILE + def.h * TILE / 2,
            `+${yieldAmt} ${ITEMS[aniDef.produces]!.name}`,
            '#3a8020',
          );
          questProgress('produce', aniDef.produces, yieldAmt);
          dailyChallengeProgress('produce', aniDef.produces, yieldAmt);
          const t = currentTheme();
          addWeeklyPoints(8, t.focus === 'pen' ? 'pen' : 'craft');
          checkAchievements();
          render();
        }
      });
    });
  }
  render();
}

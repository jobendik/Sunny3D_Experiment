import { openModal } from './modal';
import { nextUnlocks } from '../systems/unlocks';
import { state } from '../state';

function isTouchDevice(): boolean {
  return (typeof window !== 'undefined') &&
    ('ontouchstart' in window || (navigator as Navigator).maxTouchPoints > 0);
}

export function openHelp(): void {
  openModal('🌾 Sunny Acres — How to Play', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const touch = isTouchDevice();
  const controlsHTML = touch
    ? `
      <kbd>Tap</kbd><span>Use selected tool on a tile</span>
      <kbd>Drag</kbd><span>Pan the camera</span>
      <kbd>Pinch</kbd><span>Zoom in/out</span>
      <kbd>2-finger drag</kbd><span>Pan while zoomed</span>
      <kbd>Tap ↻</kbd><span>Rotate the view 90°</span>
      <kbd>Long-press</kbd><span>Inspect a tile (tooltip)</span>
      <kbd>Tap 📋</kbd><span>Open Quests & Orders</span>
      <kbd>Tap ⋯</kbd><span>More options (Barn, Decor, …)</span>
      <kbd>Tap crow</kbd><span>Scare it away & earn bonus</span>
    `
    : `
      <kbd>1</kbd><span>Hand tool — harvest & interact</span>
      <kbd>2</kbd><span>Plow tool — turn grass into farmland</span>
      <kbd>3</kbd><span>Seed tool — plant your selected seed</span>
      <kbd>Drag</kbd><span>Pan the camera</span>
      <kbd>Scroll</kbd><span>Zoom in/out</span>
      <kbd>W A S D</kbd><span>Pan with the keyboard</span>
      <kbd>Q</kbd><span>Rotate the view 90°</span>
      <kbd>Tap building</kbd><span>Open its panel</span>
      <kbd>Tap crow</kbd><span>Scare it away & earn bonus</span>
      <kbd>Esc</kbd><span>Cancel placement / close menu</span>
    `;
  document.getElementById('modal-body')!.innerHTML = `
    <div class="welcome-content">
      <h2>Welcome, farmer!</h2>
      <p>Build your dream farm. Plant crops, raise animals, fish, run production
      buildings, fulfill orders, complete quests, defend from crows, and grow your empire
      through changing seasons.</p>
      <div class="controls">
        ${controlsHTML}
      </div>
      <p style="margin-top:14px"><b>Quick start:</b></p>
      <ol style="text-align:left;font-size:13px;line-height:1.5;padding-left:20px">
        <li>Tap <b>Plow</b>, then tap any grass tile to till it.</li>
        <li>Tap <b>Seeds</b>, then tap plowed soil to plant.</li>
        <li>Wait for crops to mature (4 visible stages).</li>
        <li>Tap <b>Hand</b>, then tap mature crops to harvest.</li>
        <li>Use <b>Shop</b> to sell goods, buy seeds, or buy fruit trees.</li>
        <li>Use <b>Build</b> at level 2+ for production buildings & animal pens.</li>
        <li>Check <b>Quests</b> (📋 button) for active goals — claim when done!</li>
        <li>Deliver <b>Truck Orders</b> for big coin & XP rewards.</li>
      </ol>
      <p style="margin-top:14px"><b>Features:</b></p>
      <ul style="text-align:left;font-size:13px;line-height:1.5;padding-left:20px">
        <li>🌅 <b>Daily streak</b> — claim each day for an escalating reward, grace token saves a missed day.</li>
        <li>🎯 <b>Daily challenges</b> — 3 rotating tasks with bonus tiers and rerolls.</li>
        <li>🌦️ <b>Weather Mastery Grid</b> at Lv 5 — craft & slot weather cards to program weather effects!</li>
        <li>🌟 <b>Specialization</b> at Lv 5 — pick Crop Baron / Ranch Keeper / Artisan / Fisher.</li>
        <li>📖 <b>Collection</b> — discover crops, fish, trees, recipes for permanent passive bonuses.</li>
        <li>💱 <b>Dynamic market</b> — daily price modifiers, scarcity windows, overstock penalties.</li>
        <li>📜 <b>Choice events</b> — narrative tradeoffs with risk and reward.</li>
        <li>✨ <b>Prestige</b> at Lv 25 — reset for permanent talents.</li>
        <li>🏅 <b>Leaderboards</b> — climb the local league across 5 categories.</li>
        <li>🖼️ <b>Snapshot</b> — share your farm as a postcard image.</li>
        <li>🌱 <b>Soil quality</b> — moisture + fertility per tile. Use Fertilizer to boost.</li>
        <li>🎣 <b>Biomes + bait</b> — choose where to fish and what to use.</li>
        <li>🐮 <b>Animal mood</b> — happy pens produce more, faster.</li>
        <li>🏭 <b>Adjacency buffs</b> — production buildings boost each other when neighboring.</li>
        <li>⭐ <b>Quests</b> guide your progress; claim them for big rewards.</li>
        <li>🏆 <b>Achievements</b> reward long-term milestones.</li>
        <li>🐦 <b>Crow attacks</b> — tap crows to scare them before they eat crops.</li>
        <li>🐶 <b>Pet dog</b> at Lv 4 — finds you bonus coins.</li>
        <li>📬 <b>Mailbox</b> — Alfred drops letters & gift cards daily (up to 7/day).</li>
        <li>📦 <b>Surprise Boxes</b> — random reward boxes appear over time (common/rare/epic).</li>
        <li>🐷 <b>Piggy Bank</b> — saves a bonus diamond every time you spend coins or deliver goods.</li>
        <li>📰 <b>Daily Deal</b> — a discounted bundle for diamonds on the Gazette's first page.</li>
        <li>📖 <b>Sanctuary Book</b> — at Lv 6, record sightings of wild visitors for rewards.</li>
        <li>🌅 <b>Scenic Mode</b> — hide the HUD to admire your farm (Menu → Scenic Mode; tap to exit).</li>
        <li>✂️ <b>Edit Mode</b> — Menu → Edit, then tap/swipe to remove decorations (50% refund).</li>
        <li>⚙️ <b>Accessibility</b> — Settings panel offers reduced motion, larger text, high contrast and family-friendly mode.</li>
      </ul>
      <p style="margin-top:10px;font-style:italic;color:#666">Tip: production chains
      (wheat→bread, apple→juice, wool→cloth) earn far more than raw sales.</p>
      <p style="margin-top:8px;font-style:italic;color:#666">Pro tip: chain a Weather Card with the Daily Forecast Puzzle and Market Scarcity — that's where massive gains come from.</p>
      ${(() => {
        const next = nextUnlocks(3);
        if (!next.length) return '';
        const rows = next.map(u => `<li>Lv ${u.level} — ${u.icon} <b>${u.label}</b>${u.description ? ` — ${u.description}` : ''}</li>`).join('');
        return `<p style="margin-top:14px"><b>Coming next for you (Lv ${state.level})</b></p>
          <ul style="text-align:left;font-size:13px;line-height:1.5;padding-left:20px;color:#555">${rows}</ul>
          <p style="margin-top:6px;font-size:12px;color:#888">The ⋯ More menu reveals new systems as you reach their level — keep playing!</p>`;
      })()}
    </div>
  `;
}

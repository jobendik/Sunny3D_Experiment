import { openModal } from './modal';

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
        <li>🌦️ <b>Weather & seasons</b> affect crop growth — rain doubles speed!</li>
        <li>⭐ <b>Quests</b> guide your progress; claim them for big rewards.</li>
        <li>🏆 <b>Achievements</b> reward long-term milestones.</li>
        <li>🐦 <b>Crow attacks</b> — tap crows to scare them before they eat crops.</li>
        <li>🎣 <b>Fishing dock</b> — build one, then tap it for a timing minigame.</li>
        <li>🍎 <b>Orchard trees</b> — plant fruit trees once, harvest forever.</li>
        <li>🍽️ <b>Animal feeding</b> — pens need feed to keep producing.</li>
        <li>🎉 <b>Random events</b> — merchants visit, lucky days double yields!</li>
        <li>🌸 <b>Decorations</b> — make your farm beautiful.</li>
        <li>🐶 <b>Pet dog</b> at level 4 — finds you bonus coins.</li>
      </ul>
      <p style="margin-top:10px;font-style:italic;color:#666">Tip: production chains
      (wheat→bread, apple→juice, wool→cloth) earn far more than raw sales.</p>
    </div>
  `;
}

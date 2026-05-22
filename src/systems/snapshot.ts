// =============================================================
//  SHAREABLE SNAPSHOT — generate a postcard-style PNG with
//  the player's farm name, key stats, and a tiny preview.
// =============================================================

import { state } from '../state';
import { makeCanvas } from '../canvas';
import { sprites } from '../sprites';
import { ACHIEVEMENTS } from '../data/achievements';
import { HOME_X0, HOME_Y0 } from '../constants';

export interface SnapshotData {
  url: string;
  width: number;
  height: number;
}

function farmName(): string {
  return state.farmName || 'Sunny Acres';
}

export function buildSnapshot(): SnapshotData {
  const w = 540, h = 360;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d')!;
  // Sky background
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#bce8ff');
  sky.addColorStop(1, '#d8f0c0');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);

  // Postcard frame
  g.fillStyle = '#fff8e7';
  g.fillRect(20, 20, w - 40, h - 40);
  g.strokeStyle = '#d9b075';
  g.lineWidth = 6;
  g.strokeRect(20, 20, w - 40, h - 40);

  // Title
  g.fillStyle = '#5a3d0c';
  g.font = 'bold 28px Trebuchet MS, sans-serif';
  g.fillText(farmName(), 40, 56);
  g.font = 'bold 14px Trebuchet MS, sans-serif';
  g.fillStyle = '#7a4f2e';
  g.fillText(`Lv ${state.level}  •  Day ${state.day}  •  ${state.season}`, 40, 76);

  // Stats column
  g.font = 'bold 14px Trebuchet MS, sans-serif';
  g.fillStyle = '#3a2410';
  const stats = [
    `💰 Coins earned: ${state.stats.earned.toLocaleString()}`,
    `🌾 Crops harvested: ${state.stats.harvested.toLocaleString()}`,
    `📦 Orders fulfilled: ${state.stats.ordersFulfilled.toLocaleString()}`,
    `🐟 Fish caught: ${state.stats.fishCaught.toLocaleString()}`,
    `⭐ Quests done: ${state.stats.questsDone.toLocaleString()}`,
    `🏆 ${Object.keys(state.achievements).length} / ${ACHIEVEMENTS.length} achievements`,
  ];
  for (let i = 0; i < stats.length; i++) {
    g.fillText(stats[i]!, 40, 110 + i * 22);
  }

  // Tile preview block
  const px = w - 220;
  const py = 100;
  g.save();
  g.translate(px, py);
  g.scale(0.45, 0.45);
  // miniature 12x12 patch from state.grid — sample the upper-left of
  // the home zone so the snapshot always shows the player's farm, not
  // the forest corner.
  const cols = 12;
  const rows = 12;
  const offsetX = HOME_X0;
  const offsetY = HOME_Y0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = state.grid[y + offsetY]?.[x + offsetX];
      if (!t) continue;
      let img = sprites.grass;
      if (t.type === 'water') img = sprites.water;
      else if (t.type === 'path') img = sprites.path;
      else if (t.type === 'plowed') img = sprites.plowed;
      else if (t.type === 'soil') img = sprites.soil;
      g.drawImage(img, x * 64, y * 64);
    }
  }
  g.restore();

  // Footer
  g.font = 'italic 12px Trebuchet MS, sans-serif';
  g.fillStyle = '#888';
  g.fillText('Sunny Acres — share your farm!', 40, h - 38);

  return { url: c.toDataURL('image/png'), width: w, height: h };
}

export async function copySnapshotImage(): Promise<boolean> {
  const snap = buildSnapshot();
  try {
    const blob = await (await fetch(snap.url)).blob();
    const c = (window.navigator as Navigator & { clipboard?: { write?: (data: unknown) => Promise<void> } }).clipboard;
    if (c?.write && typeof ClipboardItem !== 'undefined') {
      await c.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    }
  } catch { /* fall back to download */ }
  return false;
}

export function downloadSnapshot(): void {
  const snap = buildSnapshot();
  const a = document.createElement('a');
  a.href = snap.url;
  a.download = `${farmName().replace(/\s+/g, '_')}-snapshot.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

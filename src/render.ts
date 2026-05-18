// =============================================================
//  RENDER  — draws the world each frame.
// =============================================================

import { state } from './state';
import { ctx, DPR, SW, SH } from './canvas';
import { TILE, GRID_W, GRID_H, DAY_SECONDS } from './constants';
import { ANIMALS } from './data/animals';
import { BUILDINGS } from './data/buildings';
import { DECORATIONS } from './data/decorations';
import { ORCHARDS } from './data/orchards';
import { SEASON_INFO } from './data/seasons';
import { sprites } from './sprites';
import { clamp, nowSeconds } from './utils';
import { screenToWorld } from './systems/camera';
import { canPlaceBuilding } from './systems/grid';
import { cropStage, isWithered, isWilting } from './systems/crops';
import { getTreeStage } from './systems/trees';
import { penFeedLevel } from './systems/pens';
import { mousePos } from './input';
import { drawDecor } from './decor';

interface Drawable {
  y: number;
  kind: 'building' | 'decor' | 'tree' | 'crow' | 'dog';
  data: unknown;
}

export function render(): void {
  ctx.save();
  ctx.scale(DPR, DPR);

  const dayElapsed = ((nowSeconds() - state.startTime) % DAY_SECONDS) / DAY_SECONDS;
  const isNight = dayElapsed > 0.85 || dayElapsed < 0.1;
  const isDusk = dayElapsed > 0.7 && dayElapsed <= 0.85;
  const isDawn = dayElapsed >= 0.1 && dayElapsed < 0.2;

  const sky = ctx.createLinearGradient(0, 0, 0, SH());
  if (state.weather === 'storm') { sky.addColorStop(0, '#5a6878'); sky.addColorStop(1, '#7a8088'); }
  else if (state.weather === 'rainy') { sky.addColorStop(0, '#90a8b8'); sky.addColorStop(1, '#a8b8c0'); }
  else if (state.weather === 'snowy') { sky.addColorStop(0, '#d8e0e8'); sky.addColorStop(1, '#e8eef0'); }
  else if (state.weather === 'cloudy') { sky.addColorStop(0, '#b8d0e0'); sky.addColorStop(1, '#d0d8d0'); }
  else if (isNight) { sky.addColorStop(0, '#1a2548'); sky.addColorStop(1, '#3a4868'); }
  else if (isDusk) { sky.addColorStop(0, '#e88060'); sky.addColorStop(1, '#f0c890'); }
  else if (isDawn) { sky.addColorStop(0, '#f0c8a0'); sky.addColorStop(1, '#ffe0c0'); }
  else { sky.addColorStop(0, '#bce8ff'); sky.addColorStop(1, '#d8f0c0'); }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SW(), SH());

  ctx.translate(SW() / 2, SH() / 2);
  ctx.scale(state.camScale, state.camScale);
  ctx.translate(-state.camX, -state.camY);

  // Tiles
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = state.grid[gy]![gx]!;
      let s: HTMLCanvasElement;
      if (t.type === 'plowed') s = sprites.plowed;
      else if (t.type === 'soil') s = sprites.soil;
      else if (t.type === 'water') s = sprites.water;
      else if (t.type === 'path') s = sprites.path;
      else s = sprites.grass;
      ctx.drawImage(s, gx * TILE, gy * TILE);

      if (state.season === 'winter' && (t.type === 'grass' || t.type === 'soil')) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#fff';
        ctx.fillRect(gx * TILE, gy * TILE, TILE, TILE);
        ctx.restore();
      }

      if (t.crop) {
        const stage = cropStage(t);
        if (stage >= 0) {
          ctx.save();
          if (isWithered(t)) ctx.globalAlpha = 0.4;
          else if (isWilting(t)) ctx.globalAlpha = 0.7;
          let bobY = 0;
          if (stage === 3 && !isWithered(t)) {
            bobY = Math.sin(performance.now() / 300 + gx * 0.5 + gy * 0.7) * 1.5;
          }
          ctx.drawImage(sprites.crops[t.crop]![stage]!, gx * TILE, gy * TILE + bobY);
          ctx.restore();

          if (stage === 3 && !isWithered(t) && !isWilting(t)) {
            ctx.save();
            ctx.globalAlpha = 0.4 + 0.2 * Math.sin(performance.now() / 200);
            ctx.shadowColor = '#ffe070';
            ctx.shadowBlur = 8;
            ctx.drawImage(sprites.crops[t.crop]![stage]!, gx * TILE, gy * TILE);
            ctx.restore();
          }

          if (isWilting(t) && !isWithered(t)) {
            ctx.save();
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#d24a4a';
            ctx.fillText('!', gx * TILE + TILE / 2 - 3, gy * TILE - 4);
            ctx.restore();
          }
        }
      }
    }
  }

  // Placement preview
  if (state.placing) {
    const w = screenToWorld(mousePos.x, mousePos.y);
    const gx = Math.floor(w.x / TILE);
    const gy = Math.floor(w.y / TILE);
    if (state.placing.decor) {
      const def = DECORATIONS[state.placing.type!]!;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.drawImage(sprites.decor[state.placing.type!]!, gx * TILE, gy * TILE);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#4ad84a';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx * TILE + 2, gy * TILE + 2, def.w * TILE - 4, def.h * TILE - 4);
      ctx.restore();
    } else if (state.placing.tree) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.drawImage(sprites.orchard[state.placing.tree]![0]!, gx * TILE, gy * TILE);
      ctx.globalAlpha = 1;
      const tile = state.grid[gy] && state.grid[gy]![gx];
      const okSoil = !!tile && (tile.type === 'plowed' || tile.type === 'soil');
      ctx.strokeStyle = okSoil ? '#4ad84a' : '#e84040';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx * TILE + 2, gy * TILE + 2, TILE - 4, TILE - 4);
      ctx.restore();
    } else if (state.placing.type) {
      const def = BUILDINGS[state.placing.type]!;
      const canPlace = canPlaceBuilding(state.placing.type, gx, gy);
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.drawImage(sprites.building[state.placing.type]!, gx * TILE, gy * TILE);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = canPlace ? '#4ad84a' : '#e84040';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx * TILE + 2, gy * TILE + 2, def.w * TILE - 4, def.h * TILE - 4);
      ctx.restore();
    }
  }

  // Depth-sorted drawables
  const drawables: Drawable[] = [];
  for (const b of state.buildings) {
    drawables.push({ y: (b.y + BUILDINGS[b.type]!.h) * TILE, kind: 'building', data: b });
  }
  for (const d of state.decor) {
    drawables.push({ y: (d.y + DECORATIONS[d.type]!.h) * TILE, kind: 'decor', data: d });
  }
  for (const tr of state.trees) {
    drawables.push({ y: (tr.y + 1) * TILE, kind: 'tree', data: tr });
  }
  for (const c of state.crows) {
    drawables.push({ y: c.y + 16, kind: 'crow', data: c });
  }
  if (state.dog) {
    drawables.push({ y: state.dog.y + 20, kind: 'dog', data: state.dog });
  }
  drawables.sort((a, b) => a.y - b.y);

  for (const d of drawables) {
    if (d.kind === 'building') {
      const b = d.data as typeof state.buildings[number];
      const def = BUILDINGS[b.type]!;
      ctx.drawImage(sprites.building[b.type]!, b.x * TILE, b.y * TILE);
      if (def.kind === 'pen' && state.penAnimals[b.id]) {
        for (const a of state.penAnimals[b.id]!) {
          const fr = a.frame || 0;
          ctx.drawImage(
            sprites.animal[def.animal!]![fr]!,
            b.x * TILE + a.ax - 32,
            b.y * TILE + a.ay - 32,
          );
        }
        const aniDef = ANIMALS[def.animal!]!;
        const hungry = penFeedLevel(b.id) < 20;
        let readyN = 0;
        for (const a of state.penAnimals[b.id]!) {
          if (!hungry && nowSeconds() - a.lastProduced >= aniDef.produceTime) readyN++;
        }
        if (readyN > 0) {
          const cx = b.x * TILE + def.w * TILE / 2;
          const cy = b.y * TILE - 8 + Math.sin(performance.now() / 200) * 3;
          ctx.drawImage(sprites.item[aniDef.produces]!, cx - 16, cy - 32, 32, 32);
          ctx.fillStyle = '#3a8020';
          ctx.beginPath(); ctx.arc(cx + 12, cy - 30, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(readyN + '', cx + 8, cy - 26);
        }
        if (hungry && state.penAnimals[b.id]!.length > 0) {
          const cx = b.x * TILE + def.w * TILE / 2;
          const cy = b.y * TILE - 8;
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText('🍽️', cx - 12, cy - 8);
          ctx.restore();
        }
      }
      if (def.kind === 'production' && state.prodQueues[b.id]) {
        const q = state.prodQueues[b.id]!;
        let readyN = 0;
        for (const job of q) if (job.doneAt <= nowSeconds()) readyN++;
        if (readyN > 0) {
          const cx = b.x * TILE + def.w * TILE / 2;
          const cy = b.y * TILE - 8 + Math.sin(performance.now() / 200) * 3;
          ctx.fillStyle = '#6abf4b';
          ctx.beginPath(); ctx.arc(cx, cy - 10, 12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('✓', cx - 5, cy - 5);
          ctx.fillStyle = '#3a2410';
          ctx.fillRect(cx - 10, cy + 4, 20, 2);
        }
      }
      if (def.kind === 'fishing') {
        const cx = b.x * TILE + def.w * TILE / 2;
        const cy = b.y * TILE - 4 + Math.sin(performance.now() / 300) * 3;
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(performance.now() / 300);
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('🎣', cx - 12, cy - 10);
        ctx.restore();
      }
    } else if (d.kind === 'decor') {
      const dec = d.data as typeof state.decor[number];
      ctx.drawImage(sprites.decor[dec.type]!, dec.x * TILE, dec.y * TILE);
      if (dec.type === 'pinwheel') {
        const cx = dec.x * TILE + TILE / 2;
        const cy = dec.y * TILE + TILE / 2 - 6;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(performance.now() / 300);
        ctx.fillStyle = '#ff80c0';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -2); ctx.lineTo(0, -10); ctx.fill();
        ctx.fillStyle = '#80c0ff';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, 10); ctx.lineTo(10, 2); ctx.fill();
        ctx.fillStyle = '#ffe080';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, 2); ctx.lineTo(0, 10); ctx.fill();
        ctx.fillStyle = '#80e080';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2, -10); ctx.lineTo(-10, -2); ctx.fill();
        ctx.restore();
      }
    } else if (d.kind === 'tree') {
      const tr = d.data as typeof state.trees[number];
      const stage = getTreeStage(tr);
      ctx.drawImage(sprites.orchard[tr.type]![stage]!, tr.x * TILE, tr.y * TILE);
      // unused but kept for parity:
      void ORCHARDS;
      if (stage === 3) {
        const cx = tr.x * TILE + TILE / 2;
        const cy = tr.y * TILE - 6 + Math.sin(performance.now() / 200) * 3;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#3a8020';
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('✓', cx - 3, cy + 4);
        ctx.restore();
      }
    } else if (d.kind === 'crow') {
      const c = d.data as typeof state.crows[number];
      ctx.drawImage(sprites.crow[c.frame]!, c.x - 16, c.y - 16);
      if (!c.scared) {
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(performance.now() / 180);
        ctx.strokeStyle = '#ff8040';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(c.x, c.y, 18, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    } else if (d.kind === 'dog') {
      const g = d.data as NonNullable<typeof state.dog>;
      ctx.drawImage(sprites.dog[g.frame]!, g.x - 24, g.y - 20);
    }
  }

  // Particles
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(1 - p.age / p.life, 0, 1);
    if (p.isRain) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 0.03, p.y + p.vy * 0.03);
      ctx.stroke();
    } else if (p.isSnow) {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  // Floats
  for (const f of state.floats) {
    ctx.save();
    ctx.globalAlpha = clamp(1 - f.age / f.life, 0, 1);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#000';
    ctx.fillText(f.text, f.x - ctx.measureText(f.text).width / 2 + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x - ctx.measureText(f.text).width / 2, f.y);
    ctx.restore();
  }

  // Grid overlay (placement only)
  if (state.placing) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= GRID_W; gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * TILE, 0);
      ctx.lineTo(gx * TILE, GRID_H * TILE);
      ctx.stroke();
    }
    for (let gy = 0; gy <= GRID_H; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * TILE);
      ctx.lineTo(GRID_W * TILE, gy * TILE);
      ctx.stroke();
    }
    ctx.restore();
  }

  // World border
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 6;
  ctx.strokeRect(-3, -3, GRID_W * TILE + 6, GRID_H * TILE + 6);
  ctx.restore();

  // Background decoration trees
  drawDecor();

  ctx.restore();

  // Screen-space atmospheric overlay
  ctx.save();
  ctx.scale(DPR, DPR);
  if (isNight) {
    ctx.fillStyle = 'rgba(20,30,60,0.45)';
    ctx.fillRect(0, 0, SW(), SH());
    ctx.fillStyle = 'rgba(255,250,220,0.85)';
    ctx.beginPath(); ctx.arc(SW() - 100, 80, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(20,30,60,0.4)';
    ctx.beginPath(); ctx.arc(SW() - 90, 76, 28, 0, Math.PI * 2); ctx.fill();
  } else if (isDusk) {
    ctx.fillStyle = 'rgba(240,140,80,0.18)';
    ctx.fillRect(0, 0, SW(), SH());
  } else if (isDawn) {
    ctx.fillStyle = 'rgba(255,200,140,0.15)';
    ctx.fillRect(0, 0, SW(), SH());
  }
  const seasonTint = SEASON_INFO[state.season].ambient;
  if (seasonTint !== 'rgba(255,220,180,0.0)' && seasonTint !== 'rgba(255,230,160,0.0)') {
    ctx.fillStyle = seasonTint;
    ctx.fillRect(0, 0, SW(), SH());
  }
  if (state.weather === 'storm') {
    ctx.fillStyle = 'rgba(40,50,80,0.25)';
    ctx.fillRect(0, 0, SW(), SH());
  } else if (state.weather === 'rainy') {
    ctx.fillStyle = 'rgba(100,120,140,0.12)';
    ctx.fillRect(0, 0, SW(), SH());
  }
  ctx.restore();
}

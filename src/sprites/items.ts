import { makeCanvas } from '../canvas';

export function spriteItem(key: string): HTMLCanvasElement {
  const c = makeCanvas(48, 48);
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(0,0,0,0)';
  g.fillRect(0, 0, 48, 48);

  switch (key) {
    case 'wheat':
      g.fillStyle = '#a08038';
      g.fillRect(20, 22, 3, 22);
      g.fillStyle = '#e0c060';
      for (let i = 0; i < 4; i++) {
        const y = 8 + i * 6;
        g.fillRect(15, y, 13, 5);
        g.fillStyle = '#ffe080'; g.fillRect(15, y, 13, 1);
        g.fillStyle = '#8a6020'; g.fillRect(21, y, 1, 5);
        g.fillStyle = '#e0c060';
      }
      break;
    case 'corn':
      g.fillStyle = '#7a9a30';
      g.fillRect(8, 14, 4, 24);
      g.fillRect(36, 14, 4, 24);
      g.fillStyle = '#f0d040';
      g.fillRect(14, 10, 20, 30);
      g.fillStyle = '#ffe080';
      g.fillRect(14, 10, 20, 3);
      g.fillStyle = '#a07020';
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) g.fillRect(16 + j * 7, 14 + i * 5, 4, 4);
      break;
    case 'carrot':
      g.fillStyle = '#3a8020';
      for (let i = 0; i < 4; i++) g.fillRect(18 + i * 3, 4, 2, 10);
      g.fillStyle = '#ff8a30';
      g.beginPath();
      g.moveTo(12, 14); g.lineTo(36, 14); g.lineTo(24, 42); g.closePath(); g.fill();
      g.fillStyle = '#ffaa50';
      g.fillRect(14, 16, 18, 2);
      g.fillStyle = '#c05010';
      g.fillRect(18, 22, 2, 2); g.fillRect(26, 28, 2, 2);
      break;
    case 'tomato':
      g.fillStyle = '#d83030';
      g.beginPath(); g.arc(24, 28, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff5050';
      g.beginPath(); g.arc(20, 24, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a8020';
      g.fillRect(18, 12, 12, 4);
      g.fillRect(20, 8, 3, 6); g.fillRect(25, 8, 3, 6);
      break;
    case 'pumpkin':
      g.fillStyle = '#e87018';
      g.beginPath(); g.ellipse(24, 30, 18, 12, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff9030';
      g.beginPath(); g.ellipse(20, 26, 5, 3, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#a04810'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(16, 22); g.quadraticCurveTo(16, 30, 16, 38); g.stroke();
      g.beginPath(); g.moveTo(24, 19); g.quadraticCurveTo(24, 30, 24, 41); g.stroke();
      g.beginPath(); g.moveTo(32, 22); g.quadraticCurveTo(32, 30, 32, 38); g.stroke();
      g.fillStyle = '#3a6a20';
      g.fillRect(22, 14, 4, 6);
      break;
    case 'strawberry':
      g.fillStyle = '#e02440';
      g.beginPath();
      g.moveTo(12, 20); g.lineTo(36, 20); g.lineTo(24, 42); g.closePath(); g.fill();
      g.fillStyle = '#ff7060';
      g.fillRect(16, 22, 5, 3);
      g.fillStyle = '#fff0a0';
      for (let i = 0; i < 6; i++) {
        g.fillRect(14 + (i % 3) * 8 + (i > 2 ? 4 : 0), 26 + Math.floor(i / 3) * 6, 2, 2);
      }
      g.fillStyle = '#3a8020';
      g.fillRect(14, 16, 20, 4);
      g.fillRect(18, 12, 4, 6); g.fillRect(26, 12, 4, 6);
      break;
    case 'sugarcane':
      g.fillStyle = '#3aa030';
      g.fillRect(14, 8, 4, 32);
      g.fillRect(22, 8, 4, 32);
      g.fillRect(30, 8, 4, 32);
      g.fillStyle = '#7adf60';
      g.fillRect(14, 8, 1, 32);
      g.fillRect(22, 8, 1, 32);
      g.fillRect(30, 8, 1, 32);
      g.fillStyle = '#2a8020';
      for (let i = 0; i < 3; i++) for (let j = 12; j < 40; j += 8) g.fillRect(14 + i * 8, j, 4, 1);
      g.fillStyle = '#e0e0a0';
      g.fillRect(12, 4, 6, 4); g.fillRect(20, 4, 6, 4); g.fillRect(28, 4, 6, 4);
      break;
    case 'egg':
      g.fillStyle = '#fff8e0';
      g.beginPath(); g.ellipse(24, 28, 13, 16, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.ellipse(20, 22, 5, 7, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#d0b090'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(24, 28, 13, 16, 0, 0, Math.PI * 2); g.stroke();
      break;
    case 'milk':
      g.fillStyle = '#fff';
      g.fillRect(14, 14, 20, 26);
      g.fillStyle = '#7ac0ef';
      g.fillRect(16, 18, 16, 20);
      g.fillStyle = '#fff';
      g.fillRect(18, 20, 4, 8);
      g.fillStyle = '#d0d0d0';
      g.fillRect(18, 8, 12, 8);
      g.fillStyle = '#3060c0';
      g.fillRect(18, 24, 12, 4);
      break;
    case 'wool':
      g.fillStyle = '#f6efe0';
      g.beginPath(); g.arc(18, 26, 8, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(30, 26, 8, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(24, 18, 8, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(24, 32, 8, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#c0b09a'; g.lineWidth = 1;
      for (const [x, y] of [[18, 26], [30, 26], [24, 18], [24, 32]] as const) {
        g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.stroke();
      }
      break;
    case 'bacon':
      g.fillStyle = '#c44848';
      g.fillRect(8, 18, 32, 14);
      g.fillStyle = '#f0c0b0';
      g.fillRect(8, 18, 32, 3);
      g.fillRect(8, 28, 32, 3);
      g.fillStyle = '#9a2828';
      g.fillRect(8, 23, 32, 2);
      break;
    case 'bread':
      g.fillStyle = '#d8a060';
      g.beginPath(); g.ellipse(24, 28, 18, 12, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f0c890';
      g.beginPath(); g.ellipse(24, 24, 14, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#a87238';
      for (let i = 0; i < 4; i++) g.fillRect(12 + i * 8, 16, 2, 6);
      break;
    case 'flour':
      g.fillStyle = '#f0e8d0';
      g.fillRect(12, 14, 24, 26);
      g.fillStyle = '#e0d0a8';
      g.fillRect(12, 14, 2, 26);
      g.fillStyle = '#a07840';
      g.fillRect(14, 10, 20, 6);
      g.fillRect(20, 6, 8, 6);
      g.fillStyle = '#fff';
      g.font = 'bold 10px sans-serif';
      g.fillText('F', 21, 32);
      break;
    case 'cookie':
      g.fillStyle = '#c8884a';
      g.beginPath(); g.arc(24, 24, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e0a060';
      g.beginPath(); g.arc(24, 24, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a1a08';
      g.beginPath(); g.arc(18, 22, 2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(28, 20, 2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(26, 30, 2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(20, 30, 2, 0, Math.PI * 2); g.fill();
      break;
    case 'cheese':
      g.fillStyle = '#f0c040';
      g.beginPath();
      g.moveTo(8, 36); g.lineTo(40, 36); g.lineTo(36, 16); g.closePath(); g.fill();
      g.fillStyle = '#ffd860';
      g.beginPath();
      g.moveTo(8, 36); g.lineTo(40, 36); g.lineTo(36, 16); g.closePath();
      g.fill();
      g.fillStyle = '#d88010';
      g.beginPath(); g.arc(22, 28, 3, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(30, 24, 2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(18, 32, 2, 0, Math.PI * 2); g.fill();
      break;
    case 'butter':
      g.fillStyle = '#fff080';
      g.fillRect(10, 18, 28, 14);
      g.fillStyle = '#ffe040';
      g.fillRect(10, 18, 28, 4);
      g.fillStyle = '#c0a020';
      g.fillRect(10, 28, 28, 4);
      g.fillStyle = '#fff';
      g.fillRect(14, 14, 20, 4);
      break;
    case 'sugar':
      g.fillStyle = '#f0f0f0';
      g.fillRect(12, 14, 24, 26);
      g.fillStyle = '#fff';
      g.fillRect(14, 14, 4, 26);
      g.fillStyle = '#c0d8ef';
      g.fillRect(14, 20, 20, 4);
      g.fillStyle = '#000';
      g.font = 'bold 8px sans-serif';
      g.fillText('SUGAR', 14, 36);
      break;
    case 'cake':
      g.fillStyle = '#f0c0d0';
      g.fillRect(10, 24, 28, 16);
      g.fillStyle = '#ffa0c0';
      g.fillRect(10, 24, 28, 4);
      g.fillStyle = '#d88080';
      g.fillRect(10, 36, 28, 4);
      g.fillStyle = '#e84050';
      g.beginPath(); g.arc(24, 18, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a8020';
      g.fillRect(23, 14, 2, 6);
      break;
    case 'feed':
      g.fillStyle = '#a0703c';
      g.fillRect(12, 16, 24, 22);
      g.fillStyle = '#c89060';
      g.fillRect(12, 16, 24, 4);
      g.fillStyle = '#704020';
      g.fillRect(14, 22, 4, 4);
      g.fillRect(22, 24, 4, 4);
      g.fillRect(28, 22, 4, 4);
      g.fillRect(18, 30, 4, 4);
      g.fillRect(26, 30, 4, 4);
      break;
    case 'apple':
      g.fillStyle = '#d83030';
      g.beginPath(); g.arc(24, 28, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff5050';
      g.beginPath(); g.arc(20, 24, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5a3a18';
      g.fillRect(23, 12, 2, 6);
      g.fillStyle = '#3a8020';
      g.beginPath(); g.ellipse(28, 14, 6, 3, 0.4, 0, Math.PI * 2); g.fill();
      break;
    case 'pear':
      g.fillStyle = '#a8c84a';
      g.beginPath(); g.arc(24, 32, 11, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(24, 22, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c8e060';
      g.beginPath(); g.arc(21, 28, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5a3a18'; g.fillRect(23, 10, 2, 6);
      g.fillStyle = '#3a8020';
      g.beginPath(); g.ellipse(28, 12, 5, 2.5, 0.4, 0, Math.PI * 2); g.fill();
      break;
    case 'yogurt':
      g.fillStyle = '#fff';
      g.fillRect(14, 16, 20, 24);
      g.fillStyle = '#f0e0c0';
      g.fillRect(14, 16, 20, 4);
      g.fillStyle = '#e060a0';
      g.fillRect(16, 22, 16, 14);
      g.fillStyle = '#ffa0d0';
      g.fillRect(16, 22, 16, 3);
      g.fillStyle = '#3a2410';
      g.font = 'bold 7px sans-serif';
      g.fillText('YO', 19, 32);
      break;
    case 'feather':
      g.strokeStyle = '#7a4f2e'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(28, 8); g.lineTo(20, 42); g.stroke();
      g.fillStyle = '#a0d0f0';
      g.beginPath();
      g.moveTo(28, 8);
      g.quadraticCurveTo(40, 18, 26, 30);
      g.quadraticCurveTo(14, 24, 28, 8);
      g.fill();
      g.fillStyle = '#7ac0ef';
      g.beginPath();
      g.moveTo(28, 14);
      g.quadraticCurveTo(36, 20, 26, 28);
      g.quadraticCurveTo(20, 22, 28, 14);
      g.fill();
      break;
    case 'bluefish':
      g.fillStyle = '#3070c0';
      g.beginPath();
      g.moveTo(8, 24); g.lineTo(20, 14); g.lineTo(36, 14);
      g.quadraticCurveTo(44, 24, 36, 34); g.lineTo(20, 34); g.closePath(); g.fill();
      g.fillStyle = '#a0c8e0';
      g.fillRect(12, 22, 22, 4);
      g.fillStyle = '#3070c0';
      g.beginPath();
      g.moveTo(8, 24); g.lineTo(2, 14); g.lineTo(2, 34); g.closePath(); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(34, 22, 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#000';
      g.beginPath(); g.arc(35, 22, 1, 0, Math.PI * 2); g.fill();
      break;
    case 'trout':
      g.fillStyle = '#7aa040';
      g.beginPath();
      g.moveTo(8, 24); g.lineTo(20, 12); g.lineTo(36, 12);
      g.quadraticCurveTo(44, 24, 36, 36); g.lineTo(20, 36); g.closePath(); g.fill();
      g.fillStyle = '#f0a060';
      g.fillRect(14, 22, 20, 5);
      g.fillStyle = '#a0c050';
      g.fillRect(14, 18, 20, 2);
      g.fillStyle = '#3a5a20';
      for (let i = 0; i < 5; i++) g.fillRect(16 + i * 4, 16, 1, 1);
      g.fillStyle = '#7aa040';
      g.beginPath(); g.moveTo(8, 24); g.lineTo(2, 12); g.lineTo(2, 36); g.closePath(); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(34, 20, 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#000';
      g.beginPath(); g.arc(35, 20, 1, 0, Math.PI * 2); g.fill();
      break;
    case 'goldfish':
      g.fillStyle = '#f4a020';
      g.beginPath();
      g.moveTo(8, 24); g.lineTo(20, 10); g.lineTo(36, 10);
      g.quadraticCurveTo(46, 24, 36, 38); g.lineTo(20, 38); g.closePath(); g.fill();
      g.fillStyle = '#ffe080';
      g.fillRect(14, 22, 22, 6);
      g.fillStyle = '#ffe040';
      g.beginPath(); g.moveTo(8, 24); g.lineTo(0, 8); g.lineTo(0, 40); g.closePath(); g.fill();
      g.fillStyle = '#c87010';
      for (let i = 0; i < 4; i++) g.fillRect(18 + i * 4, 16, 2, 2);
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(34, 20, 2.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#000';
      g.beginPath(); g.arc(35, 20, 1.4, 0, Math.PI * 2); g.fill();
      break;
    case 'juice':
      g.fillStyle = '#fff';
      g.fillRect(14, 10, 20, 28);
      g.fillStyle = '#f0d060';
      g.fillRect(16, 14, 16, 22);
      g.fillStyle = '#ffe080';
      g.fillRect(16, 14, 16, 4);
      g.fillStyle = '#888';
      g.fillRect(20, 6, 8, 6);
      g.fillStyle = '#d83030';
      g.fillRect(18, 22, 12, 6);
      g.fillStyle = '#fff';
      g.font = 'bold 7px sans-serif';
      g.fillText('JUICE', 18, 27);
      break;
    case 'jam':
      g.fillStyle = '#a04030';
      g.fillRect(14, 16, 20, 24);
      g.fillStyle = '#d83030';
      g.fillRect(16, 18, 16, 20);
      g.fillStyle = '#ff5050';
      g.fillRect(16, 18, 16, 3);
      g.fillStyle = '#888';
      g.fillRect(14, 12, 20, 6);
      g.fillStyle = '#fff';
      g.font = 'bold 6px sans-serif';
      g.fillText('JAM', 21, 29);
      break;
    case 'cloth':
      g.fillStyle = '#a050c0';
      g.fillRect(8, 16, 32, 22);
      g.fillStyle = '#c080d8';
      g.fillRect(8, 16, 32, 4);
      g.fillStyle = '#7030a0';
      g.fillRect(8, 16, 32, 1);
      g.fillRect(8, 36, 32, 2);
      g.fillStyle = '#c080d8';
      for (let i = 0; i < 8; i++) g.fillRect(10 + i * 4, 22 + (i % 2) * 8, 2, 2);
      g.fillStyle = '#fff';
      g.fillRect(36, 20, 2, 12);
      break;
    case 'ribs':
      g.fillStyle = '#8a3818';
      g.beginPath();
      g.moveTo(10, 18); g.lineTo(38, 14); g.lineTo(40, 30); g.lineTo(12, 34); g.closePath(); g.fill();
      g.fillStyle = '#c04828';
      g.beginPath();
      g.moveTo(12, 20); g.lineTo(36, 17); g.lineTo(38, 26); g.lineTo(14, 30); g.closePath(); g.fill();
      g.fillStyle = '#f0f0e0';
      for (let i = 0; i < 4; i++) g.fillRect(14 + i * 6, 22, 3, 6);
      g.fillStyle = '#3a2410';
      g.fillRect(14, 26, 22, 1);
      break;
    case 'pie':
      g.fillStyle = '#a87248';
      g.beginPath(); g.ellipse(24, 30, 18, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c89060';
      g.beginPath(); g.ellipse(24, 24, 18, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e0a070';
      g.beginPath(); g.ellipse(24, 20, 18, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8a4828';
      g.fillRect(10, 20, 28, 1);
      g.fillRect(6, 18, 4, 2); g.fillRect(38, 18, 4, 2);
      g.fillStyle = '#d83030';
      g.beginPath(); g.ellipse(24, 18, 12, 4, 0, 0, Math.PI); g.fill();
      g.strokeStyle = '#c89060'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(14, 18); g.lineTo(34, 18); g.stroke();
      g.beginPath(); g.moveTo(18, 14); g.lineTo(22, 18); g.stroke();
      g.beginPath(); g.moveTo(30, 14); g.lineTo(26, 18); g.stroke();
      break;
    case 'coin':
      g.fillStyle = '#c8961d';
      g.beginPath(); g.arc(24, 24, 16, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f4c542';
      g.beginPath(); g.arc(24, 24, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c8961d';
      g.font = 'bold 16px sans-serif';
      g.fillText('$', 19, 30);
      break;
    case 'xp':
      g.fillStyle = '#3c8dbc';
      g.beginPath();
      g.moveTo(24, 6);
      g.lineTo(30, 22); g.lineTo(42, 22);
      g.lineTo(32, 30); g.lineTo(36, 42);
      g.lineTo(24, 34); g.lineTo(12, 42);
      g.lineTo(16, 30); g.lineTo(6, 22);
      g.lineTo(18, 22); g.closePath(); g.fill();
      g.fillStyle = '#6ec8e0';
      g.beginPath();
      g.moveTo(24, 12); g.lineTo(28, 22); g.lineTo(36, 22);
      g.lineTo(30, 28); g.closePath(); g.fill();
      break;
    case 'hand':
      g.fillStyle = '#ffd0a0';
      g.fillRect(16, 14, 16, 22);
      g.fillStyle = '#e0a070';
      g.fillRect(16, 14, 2, 22);
      g.fillRect(30, 14, 2, 22);
      g.fillStyle = '#ffd0a0';
      g.fillRect(14, 16, 4, 8); g.fillRect(30, 16, 4, 8);
      g.fillRect(20, 8, 3, 8); g.fillRect(25, 8, 3, 8);
      break;
    case 'plow':
      g.fillStyle = '#7a4f2e';
      g.fillRect(12, 30, 24, 4);
      g.fillStyle = '#c0c0c0';
      g.fillRect(12, 34, 6, 8);
      g.fillRect(20, 34, 6, 8);
      g.fillRect(28, 34, 6, 8);
      g.fillStyle = '#a87248';
      g.fillRect(20, 6, 4, 26);
      g.fillStyle = '#fff';
      g.fillRect(13, 35, 6, 1); g.fillRect(21, 35, 6, 1); g.fillRect(29, 35, 6, 1);
      break;
    case 'seed':
      g.fillStyle = '#7a4f2e';
      g.fillRect(10, 18, 28, 22);
      g.fillStyle = '#c0a890';
      g.fillRect(10, 18, 28, 4);
      g.fillStyle = '#3a8020';
      for (let i = 0; i < 5; i++) {
        g.beginPath(); g.arc(14 + i * 5, 14, 2, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#7ac050';
      g.fillRect(13, 13, 2, 1); g.fillRect(28, 13, 2, 1);
      break;
    case 'shop':
      g.fillStyle = '#e87018';
      g.fillRect(8, 14, 32, 6);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = i % 2 ? '#fff' : '#e87018';
        g.fillRect(8 + i * 5, 14, 5, 6);
      }
      g.fillStyle = '#a87248';
      g.fillRect(8, 20, 32, 22);
      g.fillStyle = '#fff';
      g.fillRect(12, 24, 8, 10); g.fillRect(28, 24, 8, 10);
      g.fillStyle = '#3a2410';
      g.fillRect(22, 28, 4, 14);
      break;
    case 'inv':
      g.fillStyle = '#a87248';
      g.fillRect(6, 18, 36, 22);
      g.fillStyle = '#c89060';
      g.fillRect(6, 18, 36, 4);
      g.fillStyle = '#7a4f2e';
      g.fillRect(6, 22, 36, 1);
      g.fillRect(22, 22, 4, 18);
      g.fillStyle = '#fff';
      g.fillRect(14, 28, 2, 6); g.fillRect(30, 28, 2, 6);
      g.fillStyle = '#e0a060';
      g.fillRect(20, 12, 8, 8);
      break;
    case 'build':
      g.fillStyle = '#a87248';
      g.fillRect(10, 22, 28, 18);
      g.fillStyle = '#e84040';
      g.beginPath();
      g.moveTo(8, 22); g.lineTo(24, 8); g.lineTo(40, 22); g.closePath(); g.fill();
      g.fillStyle = '#fff';
      g.fillRect(18, 28, 5, 8); g.fillRect(25, 28, 5, 8);
      g.fillStyle = '#3a2410';
      g.fillRect(20, 18, 8, 4);
      break;
    case 'save':
      g.fillStyle = '#3c8dbc';
      g.fillRect(10, 10, 28, 28);
      g.fillStyle = '#fff';
      g.fillRect(14, 10, 20, 10);
      g.fillStyle = '#3c8dbc';
      g.fillRect(24, 12, 4, 6);
      g.fillStyle = '#a8c8e0';
      g.fillRect(14, 24, 20, 14);
      g.fillStyle = '#3a2410';
      g.fillRect(16, 26, 16, 1);
      g.fillRect(16, 30, 16, 1);
      g.fillRect(16, 34, 16, 1);
      break;
    case 'help':
      g.fillStyle = '#3c8dbc';
      g.beginPath(); g.arc(24, 24, 16, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.font = 'bold 22px sans-serif';
      g.fillText('?', 18, 32);
      break;
    case 'decor':
      g.fillStyle = '#3a8020';
      g.fillRect(22, 26, 4, 18);
      g.fillStyle = '#ff80c0';
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        g.beginPath();
        g.arc(24 + Math.cos(a) * 8, 18 + Math.sin(a) * 8, 5, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffe080';
      g.beginPath(); g.arc(24, 18, 4, 0, Math.PI * 2); g.fill();
      break;
    case 'trophy':
      g.fillStyle = '#c8961d';
      g.fillRect(14, 8, 20, 18);
      g.fillStyle = '#f4c542';
      g.fillRect(16, 10, 16, 14);
      g.fillStyle = '#c8961d';
      g.beginPath(); g.arc(14, 16, 4, Math.PI / 2, Math.PI * 3 / 2); g.fill();
      g.beginPath(); g.arc(34, 16, 4, Math.PI * 3 / 2, Math.PI / 2); g.fill();
      g.fillStyle = '#7a4f2e';
      g.fillRect(18, 26, 12, 4);
      g.fillRect(12, 30, 24, 6);
      g.fillStyle = '#ffe88a';
      g.fillRect(18, 12, 12, 2);
      g.fillStyle = '#fff';
      g.font = 'bold 9px sans-serif';
      g.fillText('★', 21, 20);
      break;
    case 'news':
      g.fillStyle = '#fff';
      g.fillRect(8, 10, 32, 30);
      g.fillStyle = '#3a2410';
      g.fillRect(8, 10, 32, 4);
      g.fillStyle = '#fff';
      g.font = 'bold 5px sans-serif';
      g.fillText('NEWS', 18, 13.5);
      g.fillStyle = '#3a2410';
      for (let i = 0; i < 5; i++) g.fillRect(10, 16 + i * 4, 28, 1.5);
      g.fillStyle = '#888';
      g.fillRect(28, 26, 10, 10);
      break;
    default:
      g.fillStyle = '#999';
      g.fillRect(8, 8, 32, 32);
  }
  return c;
}

import { sprites } from '../sprites';

export function toast(msg: string, kind = ''): void {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind === 'gold' ? 'gold' : kind === 'xp' ? 'xp' : '');
  if (kind === 'gold') {
    el.innerHTML = `<img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${msg}`;
  } else if (kind === 'xp') {
    el.innerHTML = `<img class="ico-mini" src="${sprites.item.xp!.toDataURL()}">${msg}`;
  } else {
    el.textContent = msg;
  }
  document.getElementById('toasts')!.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

export function toastXP(msg: string): void {
  toast(msg, 'xp');
}

// =============================================================
//  VISIBLE TICKER
//
//  IntersectionObserver-backed gate for small UI timers. It keeps
//  countdown refreshes from firing while a panel/HUD element is hidden,
//  off-screen, or while the tab itself is backgrounded.
// =============================================================

export interface VisibleTickerOptions {
  root: HTMLElement;
  intervalMs: number;
  tick: () => void;
  stopWhen?: () => boolean;
  runImmediately?: boolean;
}

export function startVisibleTicker(opts: VisibleTickerOptions): () => void {
  const { root, tick, stopWhen } = opts;
  const intervalMs = Math.max(250, opts.intervalMs);
  let visible = isProbablyVisible(root);
  let stopped = false;

  const observer = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(entries => {
      const entry = entries[0];
      visible = !!entry && entry.isIntersecting && entry.intersectionRatio > 0;
    }, { threshold: 0.01 })
    : null;
  observer?.observe(root);

  const shouldRun = (): boolean => (
    !stopped
    && root.isConnected
    && document.visibilityState !== 'hidden'
    && visible
    && isProbablyVisible(root)
    && !(stopWhen?.() ?? false)
  );

  if (opts.runImmediately && shouldRun()) tick();

  const id = window.setInterval(() => {
    if (stopped) return;
    if (!root.isConnected || (stopWhen?.() ?? false)) {
      stop();
      return;
    }
    if (shouldRun()) tick();
  }, intervalMs);

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(id);
    observer?.disconnect();
  };
  return stop;
}

export function trackVisibility(root: HTMLElement): () => boolean {
  let visible = isProbablyVisible(root);
  const observer = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(entries => {
      const entry = entries[0];
      visible = !!entry && entry.isIntersecting && entry.intersectionRatio > 0;
    }, { threshold: 0.01 })
    : null;
  observer?.observe(root);
  return () => root.isConnected
    && document.visibilityState !== 'hidden'
    && visible
    && isProbablyVisible(root);
}

function isProbablyVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && style.opacity !== '0';
}

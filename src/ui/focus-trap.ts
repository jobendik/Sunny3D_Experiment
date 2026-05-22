// =============================================================
//  FOCUS TRAP — Phase 4.1
//
//  Keep keyboard focus inside an opened modal / sheet / drawer.
//  Returns a release() function that restores focus to the
//  element that was active before the trap was installed.
//
//  Usage:
//    const release = trapFocus(modalEl);
//    // ... later, on close:
//    release();
// =============================================================

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="switch"]',
  '[role="tab"]',
].join(',');

function focusableInside(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR).forEach(el => {
    // Skip elements that are visually hidden or inside hidden subtree.
    if (el.hasAttribute('hidden')) return;
    if (el.getAttribute('aria-hidden') === 'true') return;
    // Skip elements with display:none ancestors (very rare false positives — that's fine).
    if (el.offsetParent === null && el !== document.activeElement) return;
    out.push(el);
  });
  return out;
}

/** Install a focus trap on `root`. Returns a release function. */
export function trapFocus(root: HTMLElement): () => void {
  const prevFocus = document.activeElement as HTMLElement | null;
  // Move focus to the first focusable element inside the root, or the
  // root itself if there is none.
  const initial = focusableInside(root)[0] ?? root;
  if (!initial.hasAttribute('tabindex') && initial === root) {
    root.setAttribute('tabindex', '-1');
  }
  try { initial.focus({ preventScroll: true }); } catch {
    // Some elements (e.g. detached) refuse focus; that's OK.
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const focusables = focusableInside(root);
    if (focusables.length === 0) {
      e.preventDefault();
      root.focus({ preventScroll: true });
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey) {
      if (active === first || !root.contains(active)) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      }
    } else {
      if (active === last || !root.contains(active)) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }
  }

  document.addEventListener('keydown', onKeydown, true);

  return function release(): void {
    document.removeEventListener('keydown', onKeydown, true);
    if (prevFocus && typeof prevFocus.focus === 'function') {
      try { prevFocus.focus({ preventScroll: true }); } catch { /* swallow */ }
    }
  };
}

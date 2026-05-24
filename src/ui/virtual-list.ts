// =============================================================
//  VIRTUAL LIST
//
//  Tiny fixed-row virtualizer for modal surfaces that can grow long.
//  It owns only the scroll viewport + visible-row window; callers keep
//  all domain rendering and event handling.
// =============================================================

export interface VirtualListOptions<T> {
  items: T[];
  rowHeight: number;
  renderRow: (item: T, index: number) => string;
  key?: (item: T, index: number) => string;
  emptyHTML?: string;
  overscan?: number;
  className?: string;
  viewportClassName?: string;
  ariaLabel?: string;
  onVisibleRange?: (start: number, end: number) => void;
}

export interface VirtualListHandle {
  refresh: () => void;
  scrollToIndex: (index: number) => void;
  viewport: HTMLElement | null;
}

export function renderVirtualList<T>(
  mount: HTMLElement,
  opts: VirtualListOptions<T>,
): VirtualListHandle {
  const items = opts.items;
  if (items.length === 0) {
    mount.innerHTML = opts.emptyHTML ?? '';
    return {
      refresh: () => undefined,
      scrollToIndex: () => undefined,
      viewport: null,
    };
  }

  const rowHeight = Math.max(1, opts.rowHeight);
  const totalHeight = items.length * rowHeight;
  const className = opts.className ? ` ${opts.className}` : '';
  const viewportClass = opts.viewportClassName ? ` ${opts.viewportClassName}` : '';
  const aria = opts.ariaLabel ? ` aria-label="${escapeAttr(opts.ariaLabel)}"` : '';

  mount.innerHTML = `
    <div class="virtual-list${className}">
      <div class="virtual-list-viewport${viewportClass}" role="list"${aria}>
        <div class="virtual-list-spacer" style="height:${totalHeight}px">
          <div class="virtual-list-window"></div>
        </div>
      </div>
    </div>
  `;

  const viewport = mount.querySelector<HTMLElement>('.virtual-list-viewport');
  const windowEl = mount.querySelector<HTMLElement>('.virtual-list-window');
  if (!viewport || !windowEl) {
    return {
      refresh: () => undefined,
      scrollToIndex: () => undefined,
      viewport: null,
    };
  }

  const overscan = opts.overscan ?? 4;
  let lastStart = -1;
  let lastEnd = -1;

  const refresh = (): void => {
    const visibleHeight = viewport.clientHeight || 420;
    const scrollTop = viewport.scrollTop;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + visibleHeight) / rowHeight) + overscan,
    );
    if (start === lastStart && end === lastEnd) return;
    lastStart = start;
    lastEnd = end;

    const rows: string[] = [];
    for (let i = start; i < end; i++) {
      const item = items[i]!;
      const key = opts.key ? opts.key(item, i) : String(i);
      rows.push(`<div class="virtual-list-row" role="listitem" data-vrow="${escapeAttr(key)}" style="height:${rowHeight}px">${opts.renderRow(item, i)}</div>`);
    }
    windowEl.style.transform = `translateY(${start * rowHeight}px)`;
    windowEl.innerHTML = rows.join('');
    opts.onVisibleRange?.(start, end);
  };

  viewport.addEventListener('scroll', refresh, { passive: true });
  refresh();

  return {
    refresh,
    scrollToIndex: (index: number): void => {
      viewport.scrollTop = Math.max(0, Math.min(items.length - 1, index)) * rowHeight;
      refresh();
    },
    viewport,
  };
}

function escapeAttr(text: string): string {
  return text.replace(/[&<>"']/g, ch => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return ch;
    }
  });
}

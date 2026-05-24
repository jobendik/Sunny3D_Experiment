// =============================================================
//  LAZY PANELS — dynamic-import wrappers for modal panels.
//
//  CrazyGames-friendly load optimisation: panel modules are only
//  fetched the first time the player opens them. After init(),
//  idlePreload() warms the cache during the browser's idle slots
//  so subsequent opens feel instant.
//
//  Usage:
//    const lazyShop = lazy(() => import('./shop'));
//    btn.addEventListener('click', () => lazyShop.call('openShop'));
//    btn2.addEventListener('click', () => lazyShop.call('openShopOffers'));
//    idlePreload([lazyShop, ...]);
// =============================================================

export interface LazyMod<T> {
  load(): Promise<T>;
  call<K extends FunctionKeys<T>>(name: K, ...args: ArgsOf<T, K>): void;
}

type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never;
}[keyof T];

type ArgsOf<T, K extends keyof T> =
  T[K] extends (...args: infer A) => unknown ? A : never;

export function lazy<T>(loader: () => Promise<T>): LazyMod<T> {
  let cached: Promise<T> | null = null;
  const load = (): Promise<T> => (cached ??= loader());
  return {
    load,
    call(name, ...args) {
      void load().then(mod => {
        const fn = mod[name] as unknown as (...a: unknown[]) => unknown;
        fn(...(args as unknown[]));
      });
    },
  };
}

/** Warm-load lazy modules during browser idle slots after init(). */
export function idlePreload(mods: Array<LazyMod<unknown>>): void {
  const ric = (cb: () => void): void => {
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(cb, { timeout: 2500 });
    } else {
      setTimeout(cb, 1200);
    }
  };

  let i = 0;
  const step = (): void => {
    if (i >= mods.length) return;
    void mods[i]!.load();
    i++;
    ric(step);
  };
  ric(step);
}

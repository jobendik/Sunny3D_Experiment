// =============================================================
//  CRAZYGAMES SDK — opt-in shim for the CrazyGames host platform.
//
//  Defaults to OFF so local dev still has zero network calls and
//  the game can be opened standalone. Enable per-session with the
//  `?cg=1` URL parameter or persistently via `localStorage`:
//
//      localStorage.setItem('sunnyacres-crazygames', '1');
//
//  When enabled, this module asynchronously loads the official SDK
//  from sdk.crazygames.com and wires it into the existing flow:
//   • loadingStart() at init() entry
//   • loadingStop() + gameplayStart() once init() returns
//   • happytime() at natural pause points (e.g. opening Settings)
//   • requestRewardedAd() for opt-in rewarded video moments
//   • saveCloud() / loadCloud() for cross-device save sync
//
//  All calls are best-effort — if the SDK fails to load or the
//  user is offline, every method resolves to a sensible no-op so
//  the game keeps working.
// =============================================================

const SDK_SRC = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const STORAGE_KEY = 'sunnyacres-crazygames';

interface CrazyGamesAdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: unknown) => void;
}

interface CrazyGamesSdk {
  init: () => Promise<void>;
  game: {
    loadingStart: () => void;
    loadingStop: () => void;
    gameplayStart: () => void;
    gameplayStop: () => void;
    happytime: () => void;
    sdkGameLoadingStop?: () => void;
  };
  ad?: {
    requestAd: (type: 'midgame' | 'rewarded', cbs: CrazyGamesAdCallbacks) => Promise<void>;
  };
  data?: {
    setItem: (k: string, v: string) => Promise<void>;
    getItem: (k: string) => Promise<string | null>;
    removeItem: (k: string) => Promise<void>;
  };
  user?: {
    getUser: () => Promise<{ username?: string; profilePictureUrl?: string } | null>;
  };
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CrazyGamesSdk };
  }
}

let sdkPromise: Promise<CrazyGamesSdk | null> | null = null;
let sdkReady = false;
let lastGameplay: 'playing' | 'paused' | null = null;

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('cg') === '1') return true;
    if (localStorage.getItem(STORAGE_KEY) === '1') return true;
  } catch {
    /* ignore */
  }
  return false;
}

function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') { resolve(); return; }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('cg sdk load failed')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_SRC;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.addEventListener('load', () => { s.dataset.loaded = '1'; resolve(); }, { once: true });
    s.addEventListener('error', () => reject(new Error('cg sdk load failed')), { once: true });
    document.head.appendChild(s);
  });
}

function loadSdk(): Promise<CrazyGamesSdk | null> {
  if (sdkPromise) return sdkPromise;
  if (!isEnabled()) return (sdkPromise = Promise.resolve(null));

  sdkPromise = (async () => {
    try {
      await injectScript();
      const sdk = window.CrazyGames?.SDK;
      if (!sdk) return null;
      await sdk.init();
      sdkReady = true;
      return sdk;
    } catch {
      return null;
    }
  })();

  return sdkPromise;
}

/** Kick off SDK loading (no-op when disabled). Call at very start. */
export function initCrazyGames(): void {
  if (!isEnabled()) return;
  void loadSdk().then(sdk => {
    if (sdk) sdk.game.loadingStart();
  });
}

/** Signal that the game has finished loading and play is starting. */
export function crazyGamesLoadingDone(): void {
  if (!isEnabled()) return;
  void loadSdk().then(sdk => {
    if (!sdk) return;
    sdk.game.loadingStop();
    sdk.game.gameplayStart();
    lastGameplay = 'playing';
  });
}

/** Pause hint — call when opening Settings, modal, or background tab. */
export function crazyGamesPause(): void {
  if (!sdkReady || lastGameplay !== 'playing') return;
  void loadSdk().then(sdk => {
    if (!sdk) return;
    sdk.game.gameplayStop();
    lastGameplay = 'paused';
  });
}

/** Resume hint — call when closing settings or returning to foreground. */
export function crazyGamesResume(): void {
  if (!sdkReady || lastGameplay !== 'paused') return;
  void loadSdk().then(sdk => {
    if (!sdk) return;
    sdk.game.gameplayStart();
    lastGameplay = 'playing';
  });
}

/** Mark a "good time for an ad" moment (between scenes, after harvest). */
export function crazyGamesHappytime(): void {
  if (!sdkReady) return;
  void loadSdk().then(sdk => { sdk?.game.happytime(); });
}

/**
 * Show a midgame interstitial. Returns true if shown, false otherwise.
 * Caller is responsible for pausing game state during the ad — we
 * forward the SDK's adStarted/adFinished callbacks via the awaited
 * promise (resolves on finish).
 */
export async function crazyGamesMidgameAd(): Promise<boolean> {
  if (!sdkReady) return false;
  const sdk = await loadSdk();
  if (!sdk?.ad) return false;
  return new Promise<boolean>(resolve => {
    let started = false;
    sdk.ad!.requestAd('midgame', {
      adStarted: () => { started = true; },
      adFinished: () => resolve(started),
      adError: () => resolve(false),
    }).catch(() => resolve(false));
  });
}

/**
 * Request a rewarded ad. Resolves true only if the user watched the
 * full ad and earned the reward. Use for opt-in features like an
 * extra wheel spin or a piggy-bank top-up.
 */
export async function crazyGamesRewardedAd(): Promise<boolean> {
  if (!sdkReady) return false;
  const sdk = await loadSdk();
  if (!sdk?.ad) return false;
  return new Promise<boolean>(resolve => {
    let watched = false;
    sdk.ad!.requestAd('rewarded', {
      adStarted: () => { watched = false; },
      adFinished: () => { watched = true; resolve(watched); },
      adError: () => resolve(false),
    }).catch(() => resolve(false));
  });
}

/** Cloud save passthrough. Returns false if SDK not ready. */
export async function crazyGamesSaveCloud(key: string, value: string): Promise<boolean> {
  if (!sdkReady) return false;
  const sdk = await loadSdk();
  if (!sdk?.data) return false;
  try {
    await sdk.data.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function crazyGamesLoadCloud(key: string): Promise<string | null> {
  if (!sdkReady) return null;
  const sdk = await loadSdk();
  if (!sdk?.data) return null;
  try {
    return await sdk.data.getItem(key);
  } catch {
    return null;
  }
}

/** Whether the SDK has been activated this session. */
export function crazyGamesActive(): boolean {
  return isEnabled();
}

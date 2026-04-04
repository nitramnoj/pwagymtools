
const GYMTOOLS_THEME_KEY = 'gymToolsTheme';
const GYMTOOLS_IDLE_TIMEOUT_MS = 90000;

function applyStoredTheme() {
  const theme = localStorage.getItem(GYMTOOLS_THEME_KEY) === 'light' ? 'light' : 'dark';
  document.body.classList.toggle('light', theme === 'light');
  document.documentElement.classList.toggle('light', theme === 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#edf1f7' : '#05070b');
}

function toggleStoredTheme() {
  const current = localStorage.getItem(GYMTOOLS_THEME_KEY) === 'light' ? 'light' : 'dark';
  localStorage.setItem(GYMTOOLS_THEME_KEY, current === 'dark' ? 'light' : 'dark');
  applyStoredTheme();
}

function bindThemeButtons() {
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', toggleStoredTheme);
  });
}

function updateClockDisplays() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const timeText = `${hh}:${mm}`;
  const dateText = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  document.querySelectorAll('[data-utility-clock]').forEach(el => {
    el.textContent = timeText;
  });
  document.querySelectorAll('[data-home-time]').forEach(el => {
    el.textContent = timeText;
  });
  document.querySelectorAll('[data-home-date]').forEach(el => {
    el.textContent = dateText;
  });
}

function startUtilityClocks() {
  updateClockDisplays();
  window.setInterval(updateClockDisplays, 1000);
}

function secondsToClock(total) {
  const s = Math.max(0, Math.round(total));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function msToClock(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return secondsToClock(total);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function tryEnterFullscreen() {
  const el = document.documentElement;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
  } catch (err) {
    console.warn('Fullscreen not available', err);
  }
}

function bindFullscreenButtons() {
  document.querySelectorAll('[data-fullscreen-toggle]').forEach(btn => {
    btn.addEventListener('click', tryEnterFullscreen);
  });
}

function installTouchGuards() {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd < 350) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false });
}

function createBeepManager() {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  async function unlock() {
    try {
      const c = getCtx();
      if (c.state === 'suspended') await c.resume();
    } catch {}
  }
  function beep(type = 'default') {
    try {
      const c = getCtx();
      const now = c.currentTime;
      const gain = c.createGain();
      gain.connect(c.destination);
      gain.gain.setValueAtTime(0.0001, now);
      const freqs = type === 'countdown' ? [880] : type === 'done' ? [660, 880] : [740];
      freqs.forEach((freq, index) => {
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        const start = now + index * 0.11;
        osc.start(start);
        gain.gain.exponentialRampToValueAtTime(0.4, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
        osc.stop(start + 0.11);
      });
    } catch(err) {
      console.warn('Beep failed', err);
    }
  }
  return { beep, unlock };
}

async function requestWakeLockSafe() {
  if (!("wakeLock" in navigator)) return null;
  try {
    const lock = await navigator.wakeLock.request('screen');
    const reset = async () => {
      if (document.visibilityState === 'visible' && !lock.released) return;
      try {
        if (document.visibilityState === 'visible') await navigator.wakeLock.request('screen');
      } catch {}
    };
    document.addEventListener('visibilitychange', reset);
    return lock;
  } catch {
    return null;
  }
}

function getClockHomeHref() {
  const path = window.location.pathname;
  if (path.endsWith('/index.html') || path.endsWith('/')) return 'index.html';
  return '../index.html';
}

function installIdleReturn() {
  if (document.body?.dataset.idleRoot === 'true') return;

  let timer = null;
  const arm = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      if (typeof window.gymtoolsIsBusy === 'function' && window.gymtoolsIsBusy()) {
        arm();
        return;
      }
      window.location.href = getClockHomeHref();
    }, GYMTOOLS_IDLE_TIMEOUT_MS);
  };

  ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel', 'scroll'].forEach(type => {
    window.addEventListener(type, arm, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') arm();
  });
  arm();
}

function registerSharedSetup() {
  applyStoredTheme();
  bindThemeButtons();
  bindFullscreenButtons();
  startUtilityClocks();
  installTouchGuards();
  installIdleReturn();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/gymtools_pwa_rebuild/sw.js').catch(() => {}));
  }
  document.addEventListener('pointerdown', () => {
    if (window.__gymtoolsBeepManager) window.__gymtoolsBeepManager.unlock();
  }, { once: true });
}

window.__gymtoolsBeepManager = createBeepManager();

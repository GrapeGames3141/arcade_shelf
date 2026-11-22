/* Injected early into published arcade pages by tools/build-pages.py. */
(() => {
  'use strict';
  const game = window.__arcadeQuickHideGame || '';
  const destination = 'https://keytrainsecure.com/';
  let hiding = false;
  let hadPointerLock = false;

  // Installed before game scripts by the Pages builder. The lobby is left alone.
  const nativeNow = performance.now.bind(performance);
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const nativeCancelRAF = window.cancelAnimationFrame.bind(window);
  let pausedAt = null, pausedDuration = 0, nextFrameId = 1;
  const frames = new Map();
  function gameNow() {
    return (pausedAt === null ? nativeNow() : pausedAt) - pausedDuration;
  }
  function scheduleFrame(id, entry) {
    entry.nativeId = nativeRAF(() => {
      entry.nativeId = null;
      if (pausedAt !== null) return;
      frames.delete(id);
      entry.callback(gameNow());
    });
  }
  if (game) {
    Object.defineProperty(performance, 'now', {configurable:true, value:gameNow});
    window.requestAnimationFrame = callback => {
      const id = nextFrameId++;
      const entry = {callback, nativeId:null};
      frames.set(id, entry);
      if (pausedAt === null) scheduleFrame(id, entry);
      return id;
    };
    window.cancelAnimationFrame = id => {
      const entry = frames.get(id);
      if (!entry) return;
      if (entry.nativeId !== null) nativeCancelRAF(entry.nativeId);
      frames.delete(id);
    };
  }
  function pauseFrames() {
    if (!game || pausedAt !== null) return;
    pausedAt = nativeNow();
    for (const entry of frames.values()) {
      if (entry.nativeId !== null) nativeCancelRAF(entry.nativeId);
      entry.nativeId = null;
    }
  }
  function resumeFrames() {
    if (pausedAt === null) return;
    pausedDuration += nativeNow() - pausedAt;
    pausedAt = null;
    for (const [id, entry] of frames) scheduleFrame(id, entry);
  }

  let dialog = null;
  let previousFocus = null;

  function closeHide() {
    if (dialog && dialog.open) dialog.close();
  }
  function hide(event) {
    if (hiding) return;
    if (event) {
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
    }
    hiding = true;
    pauseFrames();
    previousFocus = document.activeElement;
    hadPointerLock = false;
    if (document.pointerLockElement) document.exitPointerLock();

    dialog = document.createElement('dialog');
    dialog.id = 'arcade-quick-hide-dialog';
    dialog.setAttribute('aria-label', 'KeyTrain Secure');
    dialog.style.cssText = 'position:fixed!important;inset:0!important;margin:auto!important;padding:0!important;width:min(1100px,96vw)!important;height:min(760px,92vh)!important;max-width:96vw!important;max-height:92vh!important;border:1px solid #666!important;border-radius:8px!important;background:#fff!important;color:#111!important;overflow:hidden!important;z-index:2147483647!important;';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.setAttribute('aria-label', 'Close KeyTrain Secure');
    close.style.cssText = 'position:absolute!important;right:8px!important;top:8px!important;z-index:1!important;padding:8px 14px!important;border:1px solid #555!important;border-radius:4px!important;background:#fff!important;color:#111!important;font:600 14px Arial,sans-serif!important;cursor:pointer!important;';
    close.addEventListener('click', closeHide);
    const frame = document.createElement('iframe');
    frame.title = 'KeyTrain Secure';
    frame.src = destination;
    frame.style.cssText = 'display:block!important;width:100%!important;height:100%!important;border:0!important;background:#fff!important;';
    dialog.append(close, frame);
    document.documentElement.appendChild(dialog);
    dialog.addEventListener('close', () => {
      dialog.remove();
      dialog = null;
      hiding = false;
      resumeFrames();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      previousFocus = null;
    }, {once:true});
    const show = () => {
      if (!dialog || !hiding) return;
      dialog.showModal();
      close.focus();
    };
    // A dialog outside the fullscreen element is not visible in fullscreen.
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().then(show, show);
    } else show();
  }
  function editing(target) {
    return target instanceof Element && (target.isContentEditable || !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
  }
  window.addEventListener('keydown', event => {
    if (hiding) {
      if (event.key === 'Escape' && dialog && dialog.open) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeHide();
      }
      return;
    }
    if (event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const escape = event.key === 'Escape';
    const pause = (event.code === 'KeyP' && game !== 'tricktype' && game !== 'mytharium') || event.code === 'Backquote' || event.key === 'Pause';
    const eagleSpace = game === 'appalachian-eagle' && event.code === 'Space' && document.body && document.body.classList.contains('play') && !editing(event.target);
    if (escape || (pause && !editing(event.target)) || eagleSpace) hide(event);
  }, true);
  const selectors = [
    '[data-arcade-pause]', 'button[aria-label^="Pause" i]', '[role="button"][aria-label^="Pause" i]',
    'button[title^="Pause" i]', '[role="button"][title^="Pause" i]'
  ];
  if (game === 'prism-swarm') selectors.push('[data-b="p"]');
  if (game === 'appalachian-eagle') selectors.push('#tp');
  if (['splat', 'ashgrove', 'spearfish', 'firstlight'].includes(game)) selectors.push('#bPause');
  if (game === 'dustdevil') selectors.push('#tcPause');
  if (game === 'broadside' || game === 'merlin') selectors.push('#tPause');
  if (game === 'splatcraft') selectors.push('[data-a="menu"]');
  if (game === 'castle-defense') selectors.push('button[onclick*="openWorkplaceReader"]');
  // These games draw touch buttons above a canvas with pointer-events disabled,
  // so their native pause handlers use coordinates rather than event targets.
  function hitsCanvasPause(event) {
    if (event.type !== 'touchstart' || !['splat', 'ashgrove', 'spearfish'].includes(game)) return false;
    const button = document.getElementById('bPause');
    if (!button || !button.getClientRects().length) return false;
    const style = getComputedStyle(button);
    if (style.visibility !== 'visible' || style.display === 'none') return false;
    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    return Array.from(event.changedTouches).some(touch => {
      if (game === 'spearfish') return touch.clientX > rect.left - 8 && touch.clientX < rect.right + 8 && touch.clientY > rect.top - 8 && touch.clientY < rect.bottom + 8;
      return Math.hypot(touch.clientX - (rect.left + rect.width / 2), touch.clientY - (rect.top + rect.height / 2)) < rect.width * 0.62;
    });
  }
  function onPointer(event) {
    if (hiding || document.hidden) return;
    if (game === 'castle-defense' && event.type === 'touchstart' && event.touches.length >= 2) return hide(event);
    if (hitsCanvasPause(event)) return hide(event);
    const target = event.target;
    if (target instanceof Element && target.closest(selectors.join(','))) hide(event);
  }
  for (const type of ['pointerdown', 'mousedown', 'touchstart', 'click']) window.addEventListener(type, onPointer, {capture:true, passive:false});
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement) hadPointerLock = true;
    else if (hadPointerLock) {
      hadPointerLock = false;
      if (!document.hidden && document.hasFocus() && !hiding) hide();
    }
  }, true);
  /* Visible in-game Quick hide button temporarily disabled.
  if (game) {
    document.addEventListener('DOMContentLoaded', () => {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'arcade-quick-hide';
      button.setAttribute('data-arcade-pause', '');
      button.textContent = 'Quick hide';
      button.setAttribute('aria-label', 'Quick hide: open KeyTrain Secure');
      button.title = 'Quick hide (Escape, P, Pause or `)';
      button.style.cssText = 'position:fixed!important;right:max(8px,env(safe-area-inset-right))!important;top:max(8px,env(safe-area-inset-top))!important;z-index:2147483646!important;min-height:44px!important;min-width:80px!important;padding:8px 10px!important;border:1px solid #707070!important;border-radius:4px!important;background:#202621!important;color:#fff!important;font:600 12px Arial,sans-serif!important;cursor:pointer!important;';
      button.addEventListener('click', hide, true);
      document.body.appendChild(button);
    }, {once:true});
  }
  */
})();

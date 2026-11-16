export function createInput(canvas, onLockChange) {
  const keys = new Set(), pressed = new Set();
  const state = { keys, locked: false, firing: false, lookX: 0, lookY: 0 };
  const look = { x: 0, y: 0 };
  function clear() { keys.clear(); pressed.clear(); state.firing = false; state.lookX = state.lookY = 0; }
  window.addEventListener('keydown', e => {
    if (['Space', 'ControlLeft', 'ControlRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code); keys.add(e.code);
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', clear);
  window.addEventListener('mousemove', e => { if (state.locked) { state.lookX += e.movementX; state.lookY += e.movementY; } });
  window.addEventListener('mousedown', e => { if (state.locked && e.button === 0) state.firing = true; });
  window.addEventListener('mouseup', e => { if (e.button === 0) state.firing = false; });
  document.addEventListener('pointerlockchange', () => { state.locked = document.pointerLockElement === canvas; clear(); onLockChange(state.locked); });
  return { state, clear, requestLock() { const p = canvas.requestPointerLock(); if (p?.catch) p.catch(() => {}); },
    pressed(code) { const had = pressed.has(code); pressed.delete(code); return had; },
    takeLook() { look.x = state.lookX; look.y = state.lookY; state.lookX = state.lookY = 0; return look; } };
}

import * as THREE from 'three';
const AXES = ['x', 'z'];
export function createPlayer(colliders) {
  const state = { name: 'YOU', team: 'VANGUARD', position: new THREE.Vector3(0, 0, 26), velocity: new THREE.Vector3(),
    yaw: 0, pitch: 0, eye: 1.62, height: 1.78, onGround: true, crouching: false, health: 100, armor: 0, alive: true, bob: 0, footstep: 0 };
  const probe = new THREE.Box3(), wish = new THREE.Vector3();
  function overlaps(x, y, z, height, lift = .03) {
    probe.min.set(x - .32, y + lift, z - .32); probe.max.set(x + .32, y + height - lift, z + .32);
    for (let i = 0; i < colliders.length; i++) if (probe.intersectsBox(colliders[i])) return colliders[i];
    return null;
  }
  function step(dt, keys, frozen = false) {
    const p = state; if (frozen) { p.velocity.set(0, 0, 0); return; }
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    wish.set(-Math.sin(p.yaw) * forward + Math.cos(p.yaw) * strafe, 0, -Math.cos(p.yaw) * forward - Math.sin(p.yaw) * strafe).normalize();
    if (!p.alive) {
      p.position.addScaledVector(wish, dt * 9);
      p.position.y = Math.max(.2, Math.min(18, p.position.y + (Number(keys.has('Space')) - Number(keys.has('ControlLeft'))) * dt * 7));
      p.position.x = THREE.MathUtils.clamp(p.position.x, -29, 29); p.position.z = THREE.MathUtils.clamp(p.position.z, -29, 29); return;
    }
    const crouch = keys.has('ControlLeft') || keys.has('ControlRight');
    if (crouch) { p.crouching = true; p.height = 1.12; }
    else if (!overlaps(p.position.x, p.position.y, p.position.z, 1.78)) { p.crouching = false; p.height = 1.78; }
    p.eye += ((p.crouching ? 1 : 1.62) - p.eye) * Math.min(1, dt * 14);
    const speed = p.crouching ? 2.3 : 5.3, blend = Math.min(1, dt * (p.onGround ? 12 : 3));
    p.velocity.x += (wish.x * speed - p.velocity.x) * blend; p.velocity.z += (wish.z * speed - p.velocity.z) * blend;
    if (!wish.lengthSq() && p.onGround) { p.velocity.x *= Math.max(0, 1 - dt * 9); p.velocity.z *= Math.max(0, 1 - dt * 9); }
    if (keys.has('Space') && p.onGround) { p.velocity.y = 6; p.onGround = false; }
    p.velocity.y -= 20 * dt;
    for (const axis of AXES) {
      const old = p.position[axis]; p.position[axis] += p.velocity[axis] * dt;
      const hit = overlaps(p.position.x, p.position.y, p.position.z, p.height);
      if (hit) {
        const rise = hit.max.y - p.position.y;
        if (p.onGround && rise > 0 && rise <= .34 && !overlaps(p.position.x, hit.max.y + .01, p.position.z, p.height)) p.position.y = hit.max.y + .01;
        else { p.position[axis] = old; p.velocity[axis] = 0; }
      }
    }
    p.position.y += p.velocity.y * dt; p.onGround = false;
    const hit = overlaps(p.position.x, p.position.y, p.position.z, p.height, 0);
    if (hit && p.velocity.y <= 0) { p.position.y = hit.max.y + .001; p.velocity.y = 0; p.onGround = true; }
    else if (hit) { p.position.y = hit.min.y - p.height - .001; p.velocity.y = 0; }
    if (p.position.y < 0) { p.position.y = 0; p.velocity.y = 0; p.onGround = true; }
    const distance = Math.hypot(p.velocity.x, p.velocity.z) * dt;
    if (p.onGround) { p.bob += distance * 3.1; p.footstep += distance; }
  }
  return { state, step,
    look(dx, dy) { state.yaw -= dx * .002; state.pitch = THREE.MathUtils.clamp(state.pitch - dy * .002, -1.45, 1.45); },
    recoil(v, h) { state.pitch = Math.min(1.45, state.pitch + v); state.yaw += h; },
    groundSpeed() { return Math.hypot(state.velocity.x, state.velocity.z); },
    damage(amount) {
      if (!state.alive) return false;
      const absorbed = Math.min(state.armor, amount * .55); state.armor -= absorbed; state.health = Math.max(0, state.health - amount + absorbed);
      if (!state.health) { state.alive = false; state.velocity.set(0, 0, 0); return true; } return false;
    },
    reset() { state.position.set(0, 0, 26); state.velocity.set(0, 0, 0); state.health = 100; state.alive = true; state.eye = 1.62; state.height = 1.78; state.crouching = false; state.onGround = true; state.yaw = state.pitch = state.bob = state.footstep = 0; },
  };
}

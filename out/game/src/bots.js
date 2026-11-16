import * as THREE from 'three';
import { createTargets } from './targets.js';

export function createBots(scene, world, random, player) {
  const models = createTargets(scene), items = models.items;
  const origin = new THREE.Vector3(), direction = new THREE.Vector3(), point = new THREE.Vector3(), aim = new THREE.Vector3();
  const ray = new THREE.Ray(), sphere = new THREE.Sphere(), bounds = new THREE.Box3();
  const bodySize = new THREE.Vector3(.64, 1.5, .64);
  for (let i = 0; i < 9; i++) {
    const friendly = i >= 5, local = friendly ? i - 5 : i, side = local % 2 ? 1 : -1;
    const b = models.create(friendly ? 'VANGUARD' : 'OBSIDIAN', (friendly ? ['KESTREL', 'ROOK', 'ECHO', 'NOVA'] : ['ONYX', 'SHADE', 'VEX', 'CINDER', 'GHOST'])[local]);
    b.home = new THREE.Vector3(friendly ? side * (2 + local * .65) : side * (15 + local), 0, friendly ? 25 : -25);
    b.route = friendly ? [new THREE.Vector3(side * 18, 0, 22), new THREE.Vector3(side * 16, 0, 10), new THREE.Vector3(side * 16, 0, 0), new THREE.Vector3(side * 18, 0, -13)] :
      [new THREE.Vector3(side * 16, 0, -20), new THREE.Vector3(side * 16, 0, -13), new THREE.Vector3(side * 17, 0, -3), new THREE.Vector3(side * 21, 0, -13)];
    b.cover = new THREE.Vector3(); b.yaw = friendly ? 0 : Math.PI; b.target = null; b.spot = 0; b.cooldown = 0; b.think = 0; b.hold = 0; b.node = 0; b.hurt = 0; b.walk = 0;
  }
  function blocked(from, to, maxDistance = Infinity) {
    direction.subVectors(to, from); const distance = Math.min(direction.length(), maxDistance); direction.normalize(); ray.set(from, direction);
    for (let i = 0; i < world.colliders.length; i++) {
      if (ray.intersectBox(world.colliders[i], point) && from.distanceToSquared(point) < distance * distance) return true;
    } return false;
  }
  function visible(b, target) {
    if (!target.alive) return false;
    origin.copy(b.position); origin.y += 1.55; aim.copy(target.position); aim.y += target.eye ? target.eye * .8 : 1.15;
    const dx = aim.x - origin.x, dz = aim.z - origin.z, distance = Math.hypot(dx, dz);
    if (distance > 34 || distance < .01) return false;
    const dot = (-Math.sin(b.yaw) * dx - Math.cos(b.yaw) * dz) / distance;
    return (dot > .35 || b.hurt > 0 || distance < 3) && !blocked(origin, aim);
  }
  function chooseCover(b, attacker) {
    let best = Infinity;
    for (let i = 0; i < world.covers.length; i++) {
      const c = world.covers[i], d = b.position.distanceToSquared(c); if (d > 200) continue;
      origin.copy(c); origin.y = 1; aim.copy(attacker.position); aim.y += 1.4;
      const cost = d + (blocked(origin, aim) ? 0 : 120);
      if (cost < best) { best = cost; b.cover.copy(c); }
    }
  }
  function damage(b, amount, attacker) {
    if (!b.alive) return false; b.health = Math.max(0, b.health - amount); b.hurt = 2.5; b.target = attacker; b.spot = .2;
    if (attacker) { b.yaw = Math.atan2(b.position.x - attacker.position.x, b.position.z - attacker.position.z); if (b.health < 36) chooseCover(b, attacker); }
    if (b.health === 0) { b.alive = false; b.group.visible = false; b.torso.layers.disable(0); b.head.layers.disable(0); return true; } return false;
  }
  function move(b, destination, dt) {
    const dx = destination.x - b.position.x, dz = destination.z - b.position.z, d = Math.hypot(dx, dz); if (d < .3) return true;
    const step = Math.min(d, dt * (b.health < 36 ? 3.5 : 2.5));
    b.yaw = Math.atan2(-dx, -dz);
    for (let axis = 0; axis < 2; axis++) {
      const key = axis ? 'z' : 'x', old = b.position[key]; b.position[key] += (axis ? dz : dx) / d * step;
      bounds.min.set(b.position.x - .34, .06, b.position.z - .34); bounds.max.set(b.position.x + .34, 1.8, b.position.z + .34);
      for (let i = 0; i < world.colliders.length; i++) if (bounds.intersectsBox(world.colliders[i])) { b.position[key] = old; break; }
    }
    b.walk += dt * 8; b.legs[0].rotation.x = Math.sin(b.walk) * .35; b.legs[1].rotation.x = -Math.sin(b.walk) * .35; return false;
  }
  // Analytic rays use preallocated volumes, avoiding per-tick raycast hit arrays.
  function fire(b, target, hooks) {
    origin.copy(b.position); origin.y += 1.4; aim.copy(target.position); aim.y += target.eye ? target.eye * .72 : 1.12;
    direction.subVectors(aim, origin); const distance = direction.length(); direction.normalize();
    const spread = .035 + distance * .0009;
    direction.x += (random() - .5) * spread; direction.y += (random() - .5) * spread; direction.z += (random() - .5) * spread; direction.normalize(); ray.set(origin, direction);
    let nearest = 70, victim = null, head = false;
    for (let i = 0; i < world.colliders.length; i++) if (ray.intersectBox(world.colliders[i], point)) nearest = Math.min(nearest, origin.distanceTo(point));
    for (let i = -1; i < items.length; i++) {
      const actor = i < 0 ? player.state : items[i]; if (!actor.alive || actor === b) continue;
      sphere.center.copy(actor.position); sphere.center.y += actor.eye || 1.61; sphere.radius = .2;
      if (ray.intersectSphere(sphere, point)) { const d = origin.distanceTo(point); if (d < nearest) { nearest = d; victim = actor; head = true; } }
      aim.copy(actor.position); aim.y += actor.eye ? actor.height * .43 : .8; bodySize.y = actor.eye ? actor.height - .3 : 1.4; bounds.setFromCenterAndSize(aim, bodySize);
      if (ray.intersectBox(bounds, point)) { const d = origin.distanceTo(point); if (d < nearest) { nearest = d; victim = actor; head = false; } }
    }
    point.copy(direction).multiplyScalar(nearest).add(origin); hooks.tracer(origin, point, b.team);
    if (victim && victim.team !== b.team) hooks.damage(victim, (head ? 3 : 1) * 15 * Math.max(.45, 1 - nearest / 90), b, head);
    hooks.audio.gun('Rifle', true); b.cooldown = .3 + random() * .22;
  }
  function update(dt, rounds, hooks) {
    for (let i = 0; i < items.length; i++) {
      const b = items[i]; if (!b.alive) continue;
      b.cooldown = Math.max(0, b.cooldown - dt); b.hurt = Math.max(0, b.hurt - dt); b.think -= dt; b.hold -= dt;
      if (b.think <= 0) {
        b.think = .13 + random() * .07; let nearest = Infinity, found = null;
        for (let j = -1; j < items.length; j++) { const t = j < 0 ? player.state : items[j]; if (t.team === b.team || !visible(b, t)) continue; const d = b.position.distanceToSquared(t.position); if (d < nearest) { nearest = d; found = t; } }
        if (found !== b.target) b.spot = 0; b.target = found;
      }
      if (b.target && b.target.alive && b.health >= 36) {
        b.spot += dt; b.yaw = Math.atan2(b.position.x - b.target.position.x, b.position.z - b.target.position.z);
        if (b.spot > .42 && b.cooldown === 0 && visible(b, b.target)) fire(b, b.target, hooks);
      } else if (b.health < 36 && b.hurt > 0) { move(b, b.cover, dt); }
      else if (rounds.state.bomb && b.team === 'OBSIDIAN') {
        // Cross between sites via the clear rear passage, avoiding the central buildings.
        const bomb = rounds.state.bomb.position;
        if (Math.sign(b.position.x) !== Math.sign(bomb.x) && Math.abs(b.position.x) > 5) {
          aim.set(b.position.x, 0, -22); if (b.position.z > -21.7) move(b, aim, dt);
          else { aim.set(bomb.x, 0, -22); move(b, aim, dt); }
        } else if (Math.abs(b.position.x - bomb.x) > 3 && b.position.z < -20) { aim.set(bomb.x, 0, -22); move(b, aim, dt); }
        else if (b.position.distanceToSquared(bomb) > 2.25) move(b, bomb, dt);
      }
      else if (b.hold <= 0 && !(rounds.state.bomb && b.team === 'VANGUARD')) {
        if (move(b, b.route[b.node], dt)) {
          if (b.team === 'VANGUARD' && b.node === b.route.length - 1) b.hold = .2;
          else { b.node = (b.node + 1) % b.route.length; b.hold = b.team === 'OBSIDIAN' ? 2 + random() * 3 : .5; b.yaw = b.team === 'OBSIDIAN' ? Math.PI : 0; }
        }
      }
      b.group.rotation.y = b.yaw;
    }
  }
  function reset() { for (const b of items) { b.position.copy(b.home); b.health = 100; b.alive = true; b.group.visible = true; b.torso.layers.enable(0); b.head.layers.enable(0); b.node = 0; b.target = null; b.spot = b.cooldown = b.hurt = 0; b.hold = b.team === 'OBSIDIAN' ? 1 + random() * 3 : 0; b.yaw = b.team === 'VANGUARD' ? 0 : Math.PI; b.group.rotation.set(0, b.yaw, 0); } }
  reset();
  return { items, hitMeshes: models.hitMeshes, update, damage, reset, blocked,
    alive(team) { let n = team === 'VANGUARD' && player.state.alive ? 1 : 0; for (const b of items) if (b.alive && b.team === team) n++; return n; } };
}

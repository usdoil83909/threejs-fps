import * as THREE from 'three';
import { PALETTE as P } from './palette.js';
import { WEAPONS } from './buy.js';

export function createWeapon(camera, scene, world, player, bots, random, audio, onDamage) {
  const state = { name: 'Pistol', mag: 12, reserve: 48, cooldown: 0, reloadLeft: 0, flash: 0, kick: 0, shots: 0, grenades: 0 };
  const model = new THREE.Group(); camera.add(model);
  const metal = new THREE.MeshStandardMaterial({ color: P.steel, roughness: .35, metalness: .7 });
  const dark = new THREE.MeshStandardMaterial({ color: P.canvas, roughness: .7 });
  const amber = new THREE.MeshBasicMaterial({ color: P.accent });
  function part(w, h, d, x, y, z, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); model.add(m); return m; }
  part(.15, .17, .52, 0, 0, 0, metal); const barrel = part(.06, .06, .43, 0, .03, -.43, dark);
  part(.12, .24, .13, 0, -.18, .09, dark); part(.11, .23, .15, 0, -.17, -.16, metal);
  part(.13, .11, .27, 0, -.02, .34, dark); part(.07, .045, .35, 0, .11, -.04, dark);
  part(.035, .065, .025, 0, .15, -.2, amber); part(.155, .023, .22, 0, .02, .01, amber);
  part(.14, .15, .33, .015, -.25, .27, dark); part(.13, .13, .3, -.08, -.17, -.22, dark);
  const scope = part(.09, .09, .24, 0, .2, -.04, dark); scope.visible = false;
  const flash = new THREE.Mesh(new THREE.ConeGeometry(.09, .27, 5), amber); flash.rotation.x = -Math.PI / 2; flash.position.set(0, .03, -.78); model.add(flash); flash.visible = false;
  const light = new THREE.PointLight(P.accent, 0, 6); camera.add(light); light.position.set(.25, -.15, -.8);
  const ray = new THREE.Ray(), sphere = new THREE.Sphere(), box = new THREE.Box3();
  const origin = new THREE.Vector3(), direction = new THREE.Vector3(), point = new THREE.Vector3(), end = new THREE.Vector3(), old = new THREE.Vector3();
  const trails = [], grenades = [], explosions = []; let trailIndex = 0, explosionIndex = 0;
  for (let i = 0; i < 40; i++) {
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: P.accent, transparent: true, opacity: .85 })); line.frustumCulled = false; line.visible = false; scene.add(line); trails.push({ line, life: 0 });
  }
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.12, 1), metal); scene.add(mesh); mesh.visible = false;
    grenades.push({ mesh, velocity: new THREE.Vector3(), life: 0 });
    const blast = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: .3, wireframe: true, depthWrite: false })); blast.visible = false; scene.add(blast); explosions.push({ mesh: blast, life: 0 });
  }
  function tracer(from, to, team = 'VANGUARD') {
    const t = trails[trailIndex++ % trails.length], a = t.line.geometry.attributes.position;
    a.setXYZ(0, from.x, from.y, from.z); a.setXYZ(1, to.x, to.y, to.z); a.needsUpdate = true;
    t.line.material.color.set(team === 'VANGUARD' ? P.accent : P.enemy); t.line.visible = true; t.life = .075;
  }
  function spread(speed = player.groundSpeed()) { return (WEAPONS[state.name].spread + Math.min(1, speed / 5.3) * .035 + state.kick * .08) * (player.state.crouching ? .5 : 1); }
  function ready() { return state.mag > 0 && state.cooldown <= 0 && state.reloadLeft <= 0 && player.state.alive; }
  function fire() {
    if (!ready()) return false;
    const spec = WEAPONS[state.name], inaccuracy = spread();
    origin.copy(camera.position); camera.getWorldDirection(direction);
    direction.x += (random() * 2 - 1) * inaccuracy; direction.y += (random() * 2 - 1) * inaccuracy; direction.z += (random() * 2 - 1) * inaccuracy; direction.normalize(); ray.set(origin, direction);
    let nearest = spec.range, victim = null, head = false;
    for (let i = 0; i < world.colliders.length; i++) if (ray.intersectBox(world.colliders[i], point)) nearest = Math.min(nearest, origin.distanceTo(point));
    for (let i = 0; i < bots.items.length; i++) {
      const b = bots.items[i]; if (!b.alive) continue;
      sphere.center.copy(b.position); sphere.center.y += 1.61; sphere.radius = .19;
      if (ray.intersectSphere(sphere, point)) { const d = origin.distanceTo(point); if (d < nearest) { nearest = d; victim = b; head = true; } }
      box.min.set(b.position.x - .31, b.position.y + .65, b.position.z - .25); box.max.set(b.position.x + .31, b.position.y + 1.41, b.position.z + .25);
      if (ray.intersectBox(box, point)) { const d = origin.distanceTo(point); if (d < nearest) { nearest = d; victim = b; head = false; } }
    }
    end.copy(direction).multiplyScalar(nearest).add(origin); point.set(.25, -.18, -.9).applyMatrix4(camera.matrixWorld); tracer(point, end);
    if (victim && victim.team !== player.state.team) onDamage(victim, spec.damage * (head ? 3 : 1) * Math.max(.55, 1 - nearest / (spec.range * 2)), player.state, head);
    state.mag--; state.cooldown = 1 / spec.rate; state.flash = .05; state.kick = .06;
    player.recoil(spec.recoil[0], spec.recoil[1 + state.shots % (spec.recoil.length - 1)]); state.shots++; audio.gun(state.name); return true;
  }
  function reload() { const spec = WEAPONS[state.name]; if (!state.reloadLeft && state.mag < spec.mag && state.reserve > 0 && player.state.alive) { state.reloadLeft = spec.reload; audio.reload(); } }
  function explode(position) {
    audio.explosion(); const e = explosions[explosionIndex++ % explosions.length]; e.mesh.position.copy(position); e.life = .45; e.mesh.visible = true;
    for (let i = -1; i < bots.items.length; i++) {
      const actor = i < 0 ? player.state : bots.items[i]; if (!actor.alive) continue;
      point.copy(actor.position); point.y += .9; const distance = point.distanceTo(position); if (distance >= 7) continue;
      const occluded = bots.blocked(position, point); onDamage(actor, 125 * (1 - distance / 7) * (occluded ? .2 : 1), player.state, false, 'FRAG');
    }
  }
  function throwGrenade() {
    if (!state.grenades || !player.state.alive) return;
    for (let i = 0; i < grenades.length; i++) if (!grenades[i].life) {
      const g = grenades[i]; g.mesh.position.copy(camera.position); camera.getWorldDirection(g.velocity); g.velocity.multiplyScalar(13); g.velocity.y += 4.5; g.life = 2.5; g.mesh.visible = true; state.grenades--; break;
    }
  }
  function step(dt) {
    state.cooldown = Math.max(0, state.cooldown - dt); state.flash = Math.max(0, state.flash - dt); state.kick *= Math.max(0, 1 - dt * 14);
    if (state.cooldown === 0 && state.kick < .001) state.shots = 0;
    flash.visible = state.flash > 0; light.intensity = state.flash > 0 ? 14 : 0;
    model.visible = player.state.alive; model.position.set(.26 + Math.sin(player.state.bob) * .008, -.24 + Math.cos(player.state.bob * 2) * .007, -.42 + state.kick);
    model.rotation.set(state.reloadLeft ? -.5 : state.kick * 2, -.04, state.reloadLeft ? -.25 : 0);
    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      if (!state.reloadLeft) { const n = Math.min(WEAPONS[state.name].mag - state.mag, state.reserve); state.mag += n; state.reserve -= n; }
    }
    for (let i = 0; i < trails.length; i++) { const t = trails[i]; if (t.life > 0) { t.life -= dt; t.line.visible = t.life > 0; } }
    for (let i = 0; i < grenades.length; i++) {
      const g = grenades[i]; if (g.life <= 0) continue;
      g.life = Math.max(0, g.life - dt); old.copy(g.mesh.position); g.velocity.y -= 16 * dt;
      g.mesh.position.addScaledVector(g.velocity, dt); g.mesh.rotation.x += dt * 4;
      for (let j = 0; j < world.colliders.length; j++) {
        const c = world.colliders[j]; box.copy(c).expandByScalar(.12);
        if (box.containsPoint(g.mesh.position)) {
          if (old.y >= c.max.y + .1) { g.mesh.position.y = c.max.y + .13; g.velocity.y = Math.abs(g.velocity.y) * .42; g.velocity.x *= .7; g.velocity.z *= .7; }
          else { g.mesh.position.copy(old); g.velocity.x *= -.5; g.velocity.z *= -.5; } break;
        }
      }
      if (!g.life) { explode(g.mesh.position); g.mesh.visible = false; }
    }
    for (let i = 0; i < explosions.length; i++) { const e = explosions[i]; if (e.life > 0) { e.life = Math.max(0, e.life - dt); e.mesh.visible = e.life > 0; e.mesh.scale.setScalar(1 + (1 - e.life / .45) * 6); e.mesh.material.opacity = e.life * .7; } }
  }
  function refill() {
    const s = WEAPONS[state.name]; state.mag = s.mag; state.reserve = s.reserve; state.cooldown = state.reloadLeft = state.flash = state.kick = state.shots = 0;
    for (const g of grenades) { g.life = 0; g.mesh.visible = false; } for (const t of trails) { t.life = 0; t.line.visible = false; }
  }
  function equip(name) { if (!WEAPONS[name]) return; state.name = name; barrel.scale.z = name === 'Pistol' ? .3 : name === 'Sniper' ? 1.5 : 1; scope.visible = name === 'Sniper'; model.scale.setScalar(name === 'Pistol' ? .82 : 1); refill(); }
  equip('Pistol'); step(0);
  return { state, model, step, fire, reload, spread, ready, equip, refill, tracer, throwGrenade, explode };
}

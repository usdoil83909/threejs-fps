import * as THREE from 'three';
import { PALETTE as P } from './palette.js';

export function createWorld(scene) {
  const group = new THREE.Group(); scene.add(group);
  const colliders = [], shootables = [], covers = [];
  const materials = {};
  for (const key of Object.keys(P)) materials[key] = new THREE.MeshStandardMaterial({ color: P[key], roughness: .83, metalness: .2 });
  const glow = new THREE.MeshBasicMaterial({ color: P.accent });
  const blue = new THREE.MeshBasicMaterial({ color: P.friendly });
  function box(w, h, d, x, y, z, mat = 'surface', solid = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof mat === 'string' ? materials[mat] : mat);
    m.position.set(x, y, z); m.castShadow = solid; m.receiveShadow = true; group.add(m);
    if (solid) { colliders.push(new THREE.Box3().setFromObject(m)); shootables.push(m); }
    return m;
  }
  function label(text, x, y, z, size = 3, color = P.accent, floor = false) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const ctx = c.getContext('2d'); ctx.fillStyle = color; ctx.font = 'bold 82px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size / 4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y, z); if (floor) m.rotation.x = -Math.PI / 2; group.add(m); return m;
  }
  box(62, .4, 62, 0, -.2, 0, 'surface');
  box(1, 9, 62, -30.5, 4.5, 0); box(1, 9, 62, 30.5, 4.5, 0);
  box(62, 9, 1, 0, 4.5, -30.5); box(62, 9, 1, 0, 4.5, 30.5);
  // Two streets flank a central avenue with cross-lane passages.
  for (const x of [-9, 9]) for (const z of [-12, 12]) {
    box(7, 7, 12, x, 3.5, z);
    box(7.4, .3, 12.4, x, 7.05, z, 'steel');
    for (let row = 0; row < 2; row++) for (let k = 0; k < 3; k++) {
      box(.04, .85, 1.25, x + (x < 0 ? 3.51 : -3.51), 3.7 + row * 1.8, z - 4 + k * 4, row ? blue : glow, false);
    }
    box(5, .14, .2, x, 2.8, z + 6.02, glow, false);
  }
  for (const x of [-29.8, 29.8]) for (let z = -24; z <= 24; z += 8) {
    box(.35, 7 + (z % 3), 5.7, x, 4.5, z, 'hairline');
    box(.4, 3, 2, x + (x < 0 ? .2 : -.2), 1.5, z, 'canvas', false);
    box(.45, .13, 3.3, x + (x < 0 ? .2 : -.2), 3.5, z, glow, false);
  }
  for (const z of [-23, 23]) {
    box(.4, 7, .4, -5, 3.5, z, 'steel'); box(.4, 7, .4, 5, 3.5, z, 'steel');
    box(10.4, .5, .45, 0, 6.8, z, 'steel');
  }
  for (let z = -27; z <= 27; z += 4) box(.12, .012, 1.5, 0, .012, z, 'muted', false);
  for (const x of [-25, -14, -4.8, 4.8, 14, 25]) box(.07, .015, 58, x, .016, 0, 'steel', false);
  function crate(x, z, w = 2, h = 1.6, d = 2) {
    box(w, h, d, x, h / 2, z, 'hairline');
    for (const dx of [-w / 2 + .12, w / 2 - .12]) box(.09, h + .04, d + .04, x + dx, h / 2, z, 'steel', false);
    box(w + .03, .12, d + .03, x, h - .18, z, 'accent', false);
    covers.push(new THREE.Vector3(x, 0, z + d / 2 + .8), new THREE.Vector3(x, 0, z - d / 2 - .8));
  }
  crate(-18, 7, 3, 1.5); crate(18, 6, 3, 1.5); crate(-23, -8); crate(23, -9);
  crate(-2.9, -5, 1.8, 1.3); crate(3, 10, 1.8, 1.3); crate(-19, -18, 2, 2.2); crate(19, -18, 2, 2.2);
  crate(-3, 23, 2, 1.3); crate(3, -24, 2, 1.3);
  for (const x of [-26, 26]) {
    box(5, 2.1, 7, x, 1.05, -16, 'steel');
    box(.3, .8, 7, x + (x < 0 ? -2.4 : 2.4), 2.5, -16, 'hairline');
    for (let i = 0; i < 7; i++) box(3, .3 * (i + 1), .7, x, .15 * (i + 1), -7.9 - i * .7, 'steel');
    label('OVERWATCH', x, 2.12, -16, 4, P.ink, true);
  }
  const sites = [
    { name: 'ALPHA', letter: 'A', position: new THREE.Vector3(-18, 0, -13), radius: 4.4 },
    { name: 'BRAVO', letter: 'B', position: new THREE.Vector3(18, 0, -13), radius: 4.4 },
  ];
  for (const site of sites) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(site.radius, 64), new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: .09, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.copy(site.position); disc.position.y = .025; group.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(site.radius - .07, site.radius, 64), glow);
    ring.rotation.x = -Math.PI / 2; ring.position.copy(disc.position); ring.position.y += .005; group.add(ring);
    label(site.letter, site.position.x, .045, site.position.z, 10, P.accent, true);
    label(site.name + ' / ' + site.letter, site.position.x, 4.4, -29.9, 6);
  }
  label('MERIDIAN', 0, 4.8, -29.9, 8, P.ink); label('DISTRICT / 07', 0, 3.7, -29.88, 5, P.muted);
  for (const z of [-27, 27]) {
    box(11, .02, 4, 0, .02, z, 'hairline', false);
    label(z > 0 ? 'VANGUARD' : 'OBSIDIAN', 0, .045, z, 8, z > 0 ? P.friendly : P.enemy, true);
  }
  scene.add(new THREE.HemisphereLight('#a8c9ed', '#101521', 1.5));
  const moon = new THREE.DirectionalLight('#b2ceef', 2.3); moon.position.set(-14, 30, 18); moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, far: 85 }); moon.shadow.bias = -.001; scene.add(moon);
  for (const x of [-17, 17]) for (const z of [-21, 1, 21]) {
    box(.16, 5, .16, x, 2.5, z, 'steel'); box(1.5, .13, .5, x, 5, z, glow, false);
    const lamp = new THREE.PointLight(P.accent, 32, 13, 2); lamp.position.set(x, 4.7, z); scene.add(lamp);
  }
  scene.fog = new THREE.Fog(P.canvas, 23, 76);
  return { group, colliders, shootables, covers, sites, spawn: new THREE.Vector3(0, 0, 26), label };
}

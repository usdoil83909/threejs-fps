import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createBots } from './bots.js';
import { createWeapon } from './weapon.js';
import { createRounds } from './rounds.js';
import { createBuy } from './buy.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(location.search), shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const random = mulberry32(seed);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
document.getElementById('game').appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(PALETTE.canvas);
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, .05, 140); scene.add(camera);
const world = createWorld(scene), player = createPlayer(world.colliders), hud = createHud(), audio = createAudio(Boolean(shot));
const bots = createBots(scene, world, random, player);
const weapon = createWeapon(camera, scene, world, player, bots, random, audio, damage);
const bombMesh = new THREE.Mesh(new THREE.BoxGeometry(.55, .22, .4), new THREE.MeshStandardMaterial({ color: PALETTE.canvas, emissive: PALETTE.accent, emissiveIntensity: .8 })); scene.add(bombMesh); bombMesh.visible = false;
const rounds = createRounds(world, player, bots, audio, {
  reset(died) { if (died) { weapon.equip('Pistol'); player.state.armor = 0; weapon.state.grenades = 0; } weapon.refill(); bombMesh.visible = false; },
  buy(open) { buy.show(open); }, end() { input.state.firing = false; if (!shot && rounds.state.phase === 'match' && document.pointerLockElement) document.exitPointerLock(); },
  planted() { bombMesh.position.copy(rounds.state.bomb.position); bombMesh.visible = true; },
});
const buy = createBuy(rounds, player, weapon);
const input = createInput(renderer.domElement, onLockChange);
const botHooks = { damage, tracer: weapon.tracer, audio };
let started = false, paused = true, accumulator = 0, lastTime = performance.now();
function damage(victim, amount, attacker, head, kind) {
  if (!victim.alive || rounds.state.phase !== 'combat') return;
  const killed = victim === player.state ? player.damage(amount) : bots.damage(victim, amount, attacker);
  if (victim === player.state) hud.hurt();
  if (attacker === player.state && victim.team !== player.state.team) { hud.hitMarker(killed); audio.hit(); }
  if (killed) { hud.kill(attacker, victim, head, kind || (attacker === player.state ? weapon.state.name.toUpperCase() : 'RIFLE')); if (attacker === player.state && victim.team !== attacker.team) rounds.rewardKill(); }
}
function onLockChange(locked) {
  if (shot || !started) return;
  paused = !locked;
  if (locked) hud.hideOverlay(); else if (rounds.state.phase !== 'match') hud.showOverlay('paused');
  accumulator = 0;
}
function play() {
  if (shot) return;
  audio.unlock();
  if (!started || rounds.state.phase === 'match') { rounds.restart(); started = true; }
  hud.hideOverlay(); paused = false; input.requestLock();
}
hud.onPlay(play);
document.getElementById('round-result').addEventListener('click', () => { if (rounds.state.phase === 'match') play(); });
function syncCamera() { const p = player.state; camera.position.set(p.position.x, p.position.y + p.eye, p.position.z); camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ'); camera.updateMatrixWorld(true); }
function step(dt) {
  if (input.pressed('KeyB')) buy.toggle(); buy.update(input);
  const combat = rounds.state.phase === 'combat';
  if (input.state.locked) { const look = input.takeLook(); player.look(look.x, look.y); }
  player.step(dt, input.state.keys, !combat);
  syncCamera();
  weapon.step(dt);
  if (combat) {
    if (input.state.firing && !buy.open && !input.state.keys.has('KeyE')) weapon.fire();
    if (input.pressed('KeyR')) weapon.reload();
    if (input.pressed('KeyG')) weapon.throwGrenade();
    bots.update(dt, rounds, botHooks);
    if (player.state.footstep > 1.9) { player.state.footstep = 0; audio.footstep(); }
  }
  rounds.update(dt, input.state.keys);
  if (rounds.state.bomb) bombMesh.material.emissiveIntensity = .5 + Math.max(0, Math.sin(rounds.state.bomb.time * 9));
  hud.update(dt, player, weapon, rounds, bots);
}
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.1, (now - lastTime) / 1000); lastTime = now;
  if (started && !paused && rounds.state.phase !== 'match') {
    accumulator += dt;
    while (accumulator >= FIXED_STEP) { step(FIXED_STEP); accumulator -= FIXED_STEP; }
    syncCamera();
  }
  renderer.render(scene, camera);
}
function aimAt(x, y, z) { const p = player.state, dx = x - p.position.x, dy = y - p.position.y - p.eye, dz = z - p.position.z; p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(dy, Math.hypot(dx, dz)); syncCamera(); }
function runShot(name) {
  // No live loop or timers: seed-driven tableau rendered twice, then permanently frozen.
  window.__shotReady = false; rounds.begin(); buy.show(false); hud.hideOverlay();
  const p = player.state;
  if (name === 'play' || name === 'end') {
    rounds.state.phase = 'combat'; rounds.state.time = 78; rounds.state.round = 6; rounds.state.vanguard = 3; rounds.state.obsidian = 2; rounds.state.money = 2450;
    p.position.set(-16.1, 0, -.5); p.health = 86; p.armor = 67; weapon.equip('Rifle'); weapon.state.grenades = 1;
    bots.items[0].position.set(-16.8 + random() * .4, 0, -12.6); bots.items[0].group.rotation.y = Math.PI;
    bots.items[1].position.set(-21, 0, -20); bots.items[1].group.rotation.y = Math.PI;
    bots.items[5].position.set(-21.5, 0, -3.7);
    aimAt(bots.items[0].position.x, 1.2, bots.items[0].position.z);
    weapon.fire(); weapon.state.mag = 23; weapon.step(.016); hud.kill(bots.items[6], bots.items[3], false); hud.hitMarker(false);
    if (name === 'end') { rounds.finish('VANGUARD', 'OBSIDIAN ELIMINATED'); weapon.step(.1); }
  } else {
    p.position.set(1.5, 0, 21); aimAt(-1, 2.5, -15); hud.showOverlay('start');
  }
  syncCamera(); hud.update(0, player, weapon, rounds, bots);
  let paints = 0;
  function paint() { renderer.render(scene, camera); if (++paints === 2) window.__shotReady = true; else requestAnimationFrame(paint); }
  requestAnimationFrame(paint);
}
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); if (shot) renderer.render(scene, camera); });
syncCamera(); hud.update(0, player, weapon, rounds, bots);
if (shot) runShot(shot); else requestAnimationFrame(frame);

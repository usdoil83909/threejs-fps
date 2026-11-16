import * as THREE from 'three';
import { PALETTE as P } from './palette.js';

export function createTargets(scene) {
  const items = [], hitMeshes = [];
  const armor = new THREE.MeshStandardMaterial({ color: P.hairline, metalness: .45, roughness: .6 });
  const dark = new THREE.MeshStandardMaterial({ color: P.canvas, roughness: .9 });
  const bodyGeo = new THREE.BoxGeometry(.62, .72, .36), headGeo = new THREE.SphereGeometry(.19, 12, 10);
  function create(team, name) {
    const group = new THREE.Group(); scene.add(group);
    const accent = new THREE.MeshStandardMaterial({ color: team === 'VANGUARD' ? P.friendly : P.enemy, emissive: team === 'VANGUARD' ? P.friendly : P.enemy, emissiveIntensity: .45 });
    const torso = new THREE.Mesh(bodyGeo, armor); torso.position.y = 1.05;
    const head = new THREE.Mesh(headGeo, armor); head.position.y = 1.61;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.3, .075, .12), accent); visor.position.set(0, 1.64, -.17);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(.4, .08, .02), accent); badge.position.set(0, 1.2, -.19);
    group.add(torso, head, visor, badge);
    const legs = [];
    for (const x of [-.19, .19]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.22, .64, .27), dark); leg.position.set(x, .36, 0); group.add(leg); legs.push(leg);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.18, .57, .22), armor); arm.position.set(x * 2.05, 1.05, -.08); arm.rotation.x = -.45; group.add(arm);
    }
    const gun = new THREE.Mesh(new THREE.BoxGeometry(.12, .14, .75), dark); gun.position.set(.26, 1.1, -.46); group.add(gun);
    group.traverse(m => { if (m.isMesh) m.castShadow = true; });
    const item = { group, position: group.position, torso, head, legs, team, name, health: 100, alive: true };
    torso.userData.actor = head.userData.actor = item; head.userData.part = 'head'; torso.userData.part = 'body';
    items.push(item); hitMeshes.push(torso, head); return item;
  }
  return { items, hitMeshes, create };
}

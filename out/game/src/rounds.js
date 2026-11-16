import * as THREE from 'three';

export function createRounds(world, player, bots, audio, hooks) {
  const state = { phase: 'idle', time: 10, round: 1, vanguard: 0, obsidian: 0, money: 800, bomb: null,
    progress: 0, action: '', actor: null, site: null, result: '', winner: '', beep: 0 };
  const charge = { position: new THREE.Vector3(), site: null, time: 40 };
  function siteAt(position) {
    for (let i = 0; i < world.sites.length; i++) { const s = world.sites[i]; if (Math.hypot(position.x - s.position.x, position.z - s.position.z) < s.radius && position.y < 1) return s; } return null;
  }
  function begin() {
    const died = !player.state.alive;
    state.phase = 'buy'; state.time = 10; state.bomb = null; state.progress = 0; state.actor = null; state.action = ''; state.site = null;
    player.reset(); bots.reset(); hooks.reset(died); hooks.buy(true);
  }
  function finish(team, reason) {
    if (state.phase !== 'combat') return;
    state.winner = team; state.result = reason; state[team === 'VANGUARD' ? 'vanguard' : 'obsidian']++;
    state.money += team === 'VANGUARD' ? 3250 : 1400;
    state.phase = state.vanguard >= 8 || state.obsidian >= 8 ? 'match' : 'end'; state.time = 6; state.progress = 0; state.action = ''; state.actor = null;
    hooks.buy(false); audio.end(team === 'VANGUARD'); hooks.end();
  }
  function plant(actor, site) {
    charge.position.copy(actor.position); charge.position.y = .15; charge.site = site; charge.time = 40; state.bomb = charge;
    state.progress = 0; state.actor = null; state.action = ''; state.beep = 0; audio.beep(); hooks.planted();
  }
  function interaction(dt, actor, site, defuse) {
    const action = defuse ? 'DEFUSING' : 'PLANTING';
    if (state.actor !== actor || state.action !== action || state.site !== site) { state.progress = 0; state.actor = actor; state.action = action; state.site = site; }
    state.progress += dt;
    if (state.progress >= (defuse ? 6 : 4)) { if (defuse) finish('OBSIDIAN', 'PROTOCOL DISARMED'); else plant(actor, site); }
  }
  function update(dt, keys) {
    if (state.phase === 'idle' || state.phase === 'match') return;
    state.time = Math.max(0, state.time - dt);
    if (state.phase === 'buy') { if (!state.time) { state.phase = 'combat'; state.time = 115; hooks.buy(false); audio.start(); } return; }
    if (state.phase === 'end') { if (!state.time) { state.round++; begin(); } return; }
    const v = bots.alive('VANGUARD'), o = bots.alive('OBSIDIAN');
    if (!o) { finish('VANGUARD', 'OBSIDIAN ELIMINATED'); return; }
    if (!v && !state.bomb) { finish('OBSIDIAN', 'VANGUARD ELIMINATED'); return; }
    if (state.bomb) {
      state.bomb.time = Math.max(0, state.bomb.time - dt); state.beep -= dt;
      if (state.beep <= 0) { audio.beep(); state.beep = state.bomb.time < 10 ? .25 : 1; }
      if (!state.bomb.time) { audio.explosion(); finish('VANGUARD', 'PROTOCOL DETONATED'); return; }
    } else if (!state.time) { finish('OBSIDIAN', 'TIME EXPIRED'); return; }
    let actor = null, site = null, defuse = false;
    const p = player.state;
    if (p.alive && keys.has('KeyE') && player.groundSpeed() < .4) {
      if (!state.bomb && p.team === 'VANGUARD') { site = siteAt(p.position); if (site) actor = p; }
      else if (state.bomb && p.team === 'OBSIDIAN' && p.position.distanceTo(state.bomb.position) < 2.2) { actor = p; site = state.bomb.site; defuse = true; }
    }
    if (!actor) for (let i = 0; i < bots.items.length; i++) {
      const b = bots.items[i]; if (!b.alive || b.target?.alive) continue;
      if (state.bomb && b.team === 'OBSIDIAN' && b.position.distanceTo(state.bomb.position) < 2) { actor = b; site = state.bomb.site; defuse = true; break; }
      if (!state.bomb && b.team === 'VANGUARD') { site = siteAt(b.position); if (site) { actor = b; break; } }
    }
    if (actor) interaction(dt, actor, site, defuse);
    else { state.progress = 0; state.action = ''; state.actor = null; state.site = null; }
  }
  return { state, begin, update, finish, siteAt,
    restart() { state.round = 1; state.vanguard = state.obsidian = 0; state.money = 800; player.state.alive = false; begin(); },
    rewardKill() { state.money += 300; },
  };
}

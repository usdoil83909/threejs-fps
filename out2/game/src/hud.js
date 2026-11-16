export function createHud() {
  const ids = ['overlay', 'overlay-title', 'overlay-copy', 'play', 'health', 'health-fill', 'armor', 'ammo-mag', 'ammo-reserve', 'weapon-name', 'money', 'timer', 'v-score', 'o-score', 'round-number', 'phase', 'v-alive', 'o-alive', 'hitmarker', 'damage', 'crosshair', 'objective', 'interaction', 'interaction-label', 'interaction-fill', 'round-result', 'result-title', 'result-copy', 'result-score', 'spectate', 'grenades'];
  const dom = {}; for (const id of ids) dom[id] = document.getElementById(id);
  const feedRoot = document.getElementById('kill-feed'), feed = [];
  for (let i = 0; i < 5; i++) { const el = document.createElement('div'); el.hidden = true; feedRoot.appendChild(el); feed.push({ el, life: 0 }); }
  let hit = 0, damage = 0, feedIndex = 0;
  function text(id, value) { const el = dom[id]; if (el.textContent !== String(value)) el.textContent = value; }
  function showOverlay(mode = 'start') {
    dom.overlay.hidden = false;
    text('overlay-title', mode === 'paused' ? 'OPERATION PAUSED' : 'NIGHTFALL PROTOCOL');
    text('overlay-copy', mode === 'paused' ? 'Meridian District is holding. Resume to rejoin your squad.' : 'Meridian District. 02:17 AM. Breach the perimeter, secure a site, and initiate the protocol.');
    text('play', mode === 'paused' ? 'RESUME OPERATION →' : 'DEPLOY VANGUARD →');
  }
  return {
    onPlay(fn) { dom.play.addEventListener('click', fn); }, showOverlay, hideOverlay() { dom.overlay.hidden = true; },
    hitMarker(killed) { hit = killed ? .25 : .12; dom.hitmarker.style.color = killed ? '#ffbb60' : '#e8edf0'; },
    hurt() { damage = .65; },
    kill(killer, victim, head, weapon = 'RIFLE') { const f = feed[feedIndex++ % feed.length]; f.life = 4; f.el.hidden = false; f.el.textContent = `${killer.name}  ${head ? '⌖' : '›'} ${weapon}  ${victim.name}`; f.el.className = killer.team === 'VANGUARD' ? 'friendly' : 'hostile'; feedRoot.appendChild(f.el); },
    update(dt, player, weapon, rounds, bots) {
      hit = Math.max(0, hit - dt); damage = Math.max(0, damage - dt);
      dom.hitmarker.style.opacity = hit > 0 ? '1' : '0'; dom.damage.style.opacity = String(damage);
      for (let i = 0; i < feed.length; i++) { const f = feed[i]; if (f.life > 0) { f.life = Math.max(0, f.life - dt); f.el.hidden = !f.life; } }
      const p = player.state, w = weapon.state, r = rounds.state;
      text('health', Math.ceil(p.health)); dom['health-fill'].style.width = p.health + '%'; text('armor', Math.ceil(p.armor));
      text('ammo-mag', w.mag); text('ammo-reserve', '/ ' + w.reserve); text('weapon-name', w.reloadLeft ? 'RELOADING…' : w.name.toUpperCase()); text('grenades', w.grenades);
      text('money', '$' + r.money.toLocaleString('en-US')); text('v-score', r.vanguard); text('o-score', r.obsidian); text('round-number', String(r.round).padStart(2, '0'));
      const seconds = Math.ceil(r.bomb && r.phase === 'combat' ? r.bomb.time : r.time);
      text('timer', String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0'));
      text('phase', r.phase === 'buy' ? 'REQUISITION' : r.bomb ? 'PROTOCOL ACTIVE' : 'FIRST TO 8');
      text('v-alive', bots.alive('VANGUARD') + ' OPERATORS'); text('o-alive', bots.alive('OBSIDIAN') + ' OPERATORS');
      dom.crosshair.style.setProperty('--gap', (5 + weapon.spread() * 250) + 'px'); dom.crosshair.hidden = !p.alive;
      dom.spectate.hidden = p.alive; dom.interaction.hidden = !r.progress;
      text('interaction-label', r.action + ' · ' + (r.actor?.name || '') + ' · ' + r.progress.toFixed(1) + 's');
      dom['interaction-fill'].style.width = Math.min(100, r.progress / (r.action === 'DEFUSING' ? 6 : 4) * 100) + '%';
      const site = rounds.siteAt(p.position);
      text('objective', r.phase === 'buy' ? 'B / BUY EQUIPMENT  ·  MOVEMENT LOCKED' : r.bomb ? 'DEFEND ' + r.bomb.site.name + ' · PREVENT THE DEFUSE' : site ? 'HOLD E / PLANT AT ' + site.name + ' · 4 SECONDS' : 'SECURE A SITE  /  A · ALPHA     B · BRAVO');
      const ended = r.phase === 'end' || r.phase === 'match'; dom['round-result'].hidden = !ended;
      if (ended) {
        text('result-title', r.phase === 'match' ? r.winner + ' WINS' : r.winner === 'VANGUARD' ? 'ROUND SECURED' : 'ROUND LOST');
        text('result-copy', r.result + (r.phase === 'match' ? ' · CLICK TO PLAY AGAIN' : ' · NEXT ROUND IN ' + Math.ceil(r.time)));
        text('result-score', r.vanguard + ' — ' + r.obsidian);
      }
    },
  };
}

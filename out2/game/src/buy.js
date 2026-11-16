export const WEAPONS = {
  Pistol: { damage: 27, rate: 3.5, mag: 12, reserve: 48, spread: .006, recoil: [.018, -.006, .007, -.003], reload: 1.35, price: 250, range: 55 },
  SMG: { damage: 21, rate: 11, mag: 30, reserve: 120, spread: .012, recoil: [.012, -.005, .009, -.007], reload: 1.7, price: 1200, range: 45 },
  Rifle: { damage: 36, rate: 7.8, mag: 30, reserve: 90, spread: .003, recoil: [.022, -.009, .012, .006, -.012, .008], reload: 2.1, price: 2700, range: 80 },
  Sniper: { damage: 88, rate: .85, mag: 5, reserve: 20, spread: .0008, recoil: [.065, .008, -.008], reload: 2.8, price: 4750, range: 100 },
};
export function createBuy(rounds, player, weapon) {
  const panel = document.getElementById('buy'), list = document.getElementById('buy-items'), message = document.getElementById('buy-message');
  const items = [...Object.keys(WEAPONS), 'Kevlar', 'Frag grenade'];
  const buttons = [];
  function purchase(name) {
    if (rounds.state.phase !== 'buy' || !player.state.alive) return false;
    const price = WEAPONS[name]?.price ?? (name === 'Kevlar' ? 650 : 300);
    if (rounds.state.money < price) { message.textContent = 'INSUFFICIENT FUNDS'; return false; }
    if ((name === 'Kevlar' && player.state.armor >= 100) || (name === 'Frag grenade' && weapon.state.grenades >= 2)) { message.textContent = 'ALREADY AT CAPACITY'; return false; }
    rounds.state.money -= price;
    if (WEAPONS[name]) weapon.equip(name); else if (name === 'Kevlar') player.state.armor = 100; else weapon.state.grenades++;
    message.textContent = name.toUpperCase() + ' EQUIPPED'; refresh(); return true;
  }
  items.forEach((name, index) => {
    const button = document.createElement('button'), spec = WEAPONS[name];
    button.innerHTML = `<span class="buy-key">0${index + 1}</span><span><b>${name}</b><small>${spec ? spec.damage + ' DMG · ' + spec.mag + ' ROUNDS' : name === 'Kevlar' ? '100 ARMOR · 55% ABSORPTION' : 'FRAGMENTATION · 7M RADIUS'}</small></span><strong>$${spec?.price ?? (name === 'Kevlar' ? 650 : 300)}</strong>`;
    button.addEventListener('click', () => purchase(name)); list.appendChild(button); buttons.push(button);
  });
  function refresh() { for (let i = 0; i < items.length; i++) buttons[i].disabled = rounds.state.money < (WEAPONS[items[i]]?.price ?? (i === 4 ? 650 : 300)); }
  return { purchase, refresh, get open() { return !panel.hidden; },
    show(value) { panel.hidden = !value; if (value) { message.textContent = 'NUMBER KEYS 1–6 TO REQUISITION'; refresh(); } },
    toggle() { if (rounds.state.phase === 'buy') this.show(panel.hidden); },
    update(input) { if (!panel.hidden) for (let i = 0; i < items.length; i++) if (input.pressed('Digit' + (i + 1))) purchase(items[i]); },
  };
}

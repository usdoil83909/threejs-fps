// Every sound is synthesized locally after a user gesture.
export function createAudio(skip = false) {
  let ctx, master, noise;
  function unlock() {
    if (skip) return;
    if (!ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
      ctx = new Audio(); master = ctx.createGain(); master.gain.value = .22; master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const samples = noise.getChannelData(0); let n = 721;
      for (let i = 0; i < samples.length; i++) { n = (Math.imul(n, 1664525) + 1013904223) | 0; samples[i] = (n >>> 0) / 2147483648 - 1; }
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function tone(freq, duration, volume = .3, type = 'sine', delay = 0, end = freq) {
    if (!ctx) return; const t = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(.001, t + duration); osc.connect(gain); gain.connect(master); osc.start(t); osc.stop(t + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function burst(duration, volume, cutoff) {
    if (!ctx) return; const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise;
    f.type = 'lowpass'; f.frequency.value = cutoff; g.gain.setValueAtTime(volume, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
    s.connect(f); f.connect(g); g.connect(master); s.start(); s.stop(ctx.currentTime + duration); s.onended = () => { s.disconnect(); f.disconnect(); g.disconnect(); };
  }
  return { unlock,
    gun(name, distant = false) { const v = distant ? .15 : .7; const low = name === 'Sniper' ? 65 : name === 'SMG' ? 150 : 100; burst(name === 'Sniper' ? .3 : .13, v, name === 'Pistol' ? 1900 : 3300); tone(low, .16, v, 'triangle', 0, 30); },
    reload() { tone(900, .06, .2, 'square'); tone(650, .08, .15, 'square', .23); },
    footstep() { burst(.07, .12, 300); }, hit() { tone(1600, .06, .2, 'triangle', 0, 650); },
    start() { tone(330, .15); tone(440, .15, .3, 'sine', .16); tone(660, .3, .3, 'sine', .32); },
    end(win) { tone(win ? 440 : 220, .3); tone(win ? 660 : 145, .6, .3, 'triangle', .2); },
    beep() { tone(1400, .09, .25); }, explosion() { burst(.7, 1, 1200); tone(70, .6, .8, 'sine', 0, 22); },
  };
}

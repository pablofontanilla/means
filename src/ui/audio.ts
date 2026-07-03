// The stamp sound (§9) — load-bearing twice over: dopamine anchor in Act 1, the
// same sample muffled/distant as the dread anchor in Act 2. Synthesized with Web
// Audio so timing is exact and no asset needs shipping. A stamp is a short
// noise-burst "thock" (the pad hitting paper) plus a low wooden body thump.

let ctx: AudioContext | null = null;

function audio(): AudioContext {
  // Lazily created + resumed on first gesture (autoplay policy).
  ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noiseBuffer(ac: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

interface StampOptions {
  muffled?: boolean; // Act 2 clerk: distant, behind a wall (§7.2)
  gain?: number;
}

/** Play one stamp. Bright and close by default; dull and distant if muffled. */
export function playStamp(opts: StampOptions = {}): void {
  let ac: AudioContext;
  try {
    ac = audio();
  } catch {
    return; // no audio available — fail silent
  }
  const t = ac.currentTime;
  const muffled = opts.muffled ?? false;
  const master = ac.createGain();
  master.gain.value = (opts.gain ?? 1) * (muffled ? 0.32 : 0.9);
  master.connect(ac.destination);

  // 1) The pad slap — a short filtered noise burst.
  const noise = ac.createBufferSource();
  noise.buffer = noiseBuffer(ac, 0.06);
  const nf = ac.createBiquadFilter();
  nf.type = muffled ? "lowpass" : "bandpass";
  nf.frequency.value = muffled ? 700 : 2600;
  nf.Q.value = muffled ? 0.7 : 1.1;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(muffled ? 0.5 : 1, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + (muffled ? 0.09 : 0.05));
  noise.connect(nf).connect(ng).connect(master);
  noise.start(t);
  noise.stop(t + 0.1);

  // 2) The wooden body — a fast low sine thump.
  const osc = ac.createOscillator();
  osc.type = "sine";
  const f0 = muffled ? 120 : 190;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + 0.08);
  const og = ac.createGain();
  og.gain.setValueAtTime(muffled ? 0.5 : 0.9, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + (muffled ? 0.16 : 0.12));
  osc.connect(og).connect(master);
  osc.start(t);
  osc.stop(t + 0.2);
}

/** A soft tick for KPI counters ratcheting up (§6.5). */
export function playTick(): void {
  let ac: AudioContext;
  try {
    ac = audio();
  } catch {
    return;
  }
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.value = 880;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.06, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.05);
}

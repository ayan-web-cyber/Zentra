// Outgoing "ringback" and incoming "ringtone" sounds for calling, synthesized with the
// Web Audio API so there's no external audio asset to ship or go missing. This was the
// piece of Phase 7 (calling) that was never actually built — the call screens existed but
// played no sound, so neither side ever heard anything ring.
let audioCtx = null;
let timer = null;
let activeOscillators = [];

function getCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    // Browsers block autoplay until a user gesture. The caller side is always started by a
    // click (the call button), which counts — this just makes sure a stale-suspended context
    // gets woken back up.
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function beep(freqs, startTime, duration, gainValue = 0.12) {
  const ctx = getCtx();
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  gain.connect(ctx.destination);
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + duration);
    activeOscillators.push(osc);
  });
}

export function stopTone() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  activeOscillators.forEach((o) => {
    try {
      o.stop();
    } catch {
      /* already stopped */
    }
  });
  activeOscillators = [];
}

// Outgoing call — classic two-tone ringback: ~2s tone, ~4s silence, repeating.
export function startRingback() {
  stopTone();
  const ctx = getCtx();
  const cycle = () => beep([440, 480], ctx.currentTime, 2);
  cycle();
  timer = setInterval(cycle, 6000);
}

// Incoming call — a brighter two-note chime, repeating faster so it's easy to notice.
export function startRingtone() {
  stopTone();
  const ctx = getCtx();
  const cycle = () => {
    const now = ctx.currentTime;
    beep([784], now, 0.35);
    beep([880], now + 0.4, 0.35);
  };
  cycle();
  timer = setInterval(cycle, 1500);
}

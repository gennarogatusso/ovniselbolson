let awkaAudioContext: AudioContext | null = null;

export function unlockAwkaSirenAudio() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    if (!awkaAudioContext) awkaAudioContext = new window.AudioContext();
    if (awkaAudioContext.state !== "running") void awkaAudioContext.resume();
  } catch (error) {
    console.warn("No se pudo preparar el audio de la sirena", error);
  }
}

export function playAwkaSirenAudio() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    if (!awkaAudioContext) awkaAudioContext = new window.AudioContext();
    const context = awkaAudioContext;
    if (context.state !== "running") void context.resume();
    const now = context.currentTime;
    const main = context.createOscillator();
    const undertone = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const lowGain = context.createGain();
    main.type = "sawtooth";
    undertone.type = "sine";
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1450, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.12);
    gain.gain.setValueAtTime(0.16, now + 3.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.1);
    lowGain.gain.setValueAtTime(0.0001, now);
    lowGain.gain.exponentialRampToValueAtTime(0.045, now + 0.12);
    lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.1);
    for (let cycle = 0; cycle < 3; cycle++) {
      const start = now + cycle * 1.3;
      main.frequency.setValueAtTime(690, start);
      main.frequency.linearRampToValueAtTime(990, start + 0.62);
      main.frequency.linearRampToValueAtTime(690, start + 1.28);
      undertone.frequency.setValueAtTime(345, start);
      undertone.frequency.linearRampToValueAtTime(495, start + 0.62);
      undertone.frequency.linearRampToValueAtTime(345, start + 1.28);
    }
    main.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    undertone.connect(lowGain);
    lowGain.connect(context.destination);
    main.start(now);
    undertone.start(now);
    main.stop(now + 4.12);
    undertone.stop(now + 4.12);
  } catch (error) {
    console.warn("No se pudo reproducir la sirena policial", error);
  }
}

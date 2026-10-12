// Original, gesture-gated synthesized score and effects. No remote audio assets.
export class GameAudio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  muted = true;
  lastBeat = -1;
  lastShot = -1;
  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.16;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        muted ? 0 : 0.16,
        this.context.currentTime,
        0.02,
      );
  }
  tone(
    f: number,
    duration: number,
    type: OscillatorType = "sine",
    volume = 0.3,
    slide?: number,
  ) {
    if (!this.context || !this.master || this.muted) return;
    const ctx = this.context,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, ctx.currentTime);
    if (slide)
      o.frequency.exponentialRampToValueAtTime(
        slide,
        ctx.currentTime + duration,
      );
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(ctx.currentTime + duration + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  tick(tick: number, shooting: boolean) {
    const stage = Math.min(2, Math.floor(tick / 600)),
      beat = Math.floor(tick / (stage === 2 ? 7 : stage === 1 ? 8 : 9));
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      const notes =
        stage === 0
          ? [55, 55, 82.41, 65.41]
          : stage === 1
            ? [55, 73.42, 82.41, 110]
            : [65.41, 82.41, 98, 110];
      this.tone(notes[beat % 4], 0.18, "triangle", 0.27);
      if (beat % 4 === 0) this.tone(110, 0.09, "sine", 0.35, 40);
      if (beat % 2 === 1) this.tone(notes[beat % 4] * 4, 0.08, "sine", 0.07);
    }
    if (shooting && tick % 6 === 1 && tick !== this.lastShot) {
      this.lastShot = tick;
      this.tone(590 + (tick % 4) * 45, 0.07, "triangle", 0.12, 160);
    }
  }
  impact() {
    this.tone(170, 0.13, "sawtooth", 0.13, 36);
    this.tone(660, 0.13, "sine", 0.17, 330);
  }
  damage() {
    this.tone(85, 0.22, "sawtooth", 0.2, 35);
  }
  finish(won: boolean) {
    [0, 1, 2].forEach((i) => {
      this.tone(
        (won ? [261.63, 329.63, 392] : [110, 130.81, 155.56])[i],
        0.5,
        "triangle",
        0.12,
      );
    });
  }
  destroy() {
    void this.context?.close();
  }
}

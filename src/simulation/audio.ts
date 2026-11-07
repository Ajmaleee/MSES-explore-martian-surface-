/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class MarsAudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private masterGain: GainNode | null = null;

  // Motor sound
  private motorOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;

  // Ambient Martian wind
  private windNoiseNode: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  // Servo sound
  private servoOsc: OscillatorNode | null = null;
  private servoGain: GainNode | null = null;

  // Drill sound
  private drillOsc: OscillatorNode | null = null;
  private drillGain: GainNode | null = null;

  constructor() {
    // Initialized on first user interaction or un-mute
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.6;
      this.masterGain.connect(this.ctx.destination);

      this.setupWindAmbient();
      this.setupMotorSynth();
      this.setupServoSynth();
      this.setupDrillSynth();
    } catch {
      // Audio not supported or blocked
    }
  }

  private setupWindAmbient() {
    if (!this.ctx || !this.masterGain) return;
    // Generate 4-second pink-like noise buffer for procedural wind
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    this.windNoiseNode = this.ctx.createBufferSource();
    this.windNoiseNode.buffer = noiseBuffer;
    this.windNoiseNode.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 420;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.18;

    this.windNoiseNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    this.windNoiseNode.start(0);
  }

  private setupMotorSynth() {
    if (!this.ctx || !this.masterGain) return;
    this.motorOsc = this.ctx.createOscillator();
    this.motorOsc.type = 'sawtooth';
    this.motorOsc.frequency.value = 45;

    this.motorFilter = this.ctx.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.value = 160;

    this.motorGain = this.ctx.createGain();
    this.motorGain.gain.value = 0;

    this.motorOsc.connect(this.motorFilter);
    this.motorFilter.connect(this.motorGain);
    this.motorGain.connect(this.masterGain);

    this.motorOsc.start(0);
  }

  private setupServoSynth() {
    if (!this.ctx || !this.masterGain) return;
    this.servoOsc = this.ctx.createOscillator();
    this.servoOsc.type = 'triangle';
    this.servoOsc.frequency.value = 880;

    this.servoGain = this.ctx.createGain();
    this.servoGain.gain.value = 0;

    this.servoOsc.connect(this.servoGain);
    this.servoGain.connect(this.masterGain);

    this.servoOsc.start(0);
  }

  private setupDrillSynth() {
    if (!this.ctx || !this.masterGain) return;
    this.drillOsc = this.ctx.createOscillator();
    this.drillOsc.type = 'square';
    this.drillOsc.frequency.value = 120;

    this.drillGain = this.ctx.createGain();
    this.drillGain.gain.value = 0;

    this.drillOsc.connect(this.drillGain);
    this.drillGain.connect(this.masterGain);

    this.drillOsc.start(0);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx && !muted) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.6, this.ctx.currentTime, 0.05);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public updateMotor(speedKmh: number, throttle: boolean) {
    if (!this.ctx || this.isMuted || !this.motorGain || !this.motorOsc || !this.motorFilter) return;
    const now = this.ctx.currentTime;
    const speedRatio = Math.min(1.0, Math.abs(speedKmh) / 18.0);
    const targetFreq = 40 + speedRatio * 180 + (throttle ? 30 : 0);
    const targetGain = throttle ? 0.08 + speedRatio * 0.15 : speedRatio * 0.05;
    const filterFreq = 140 + speedRatio * 400;

    this.motorOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.motorGain.gain.setTargetAtTime(targetGain, now, 0.08);
    this.motorFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
  }

  public setServoActive(active: boolean) {
    if (!this.ctx || this.isMuted || !this.servoGain || !this.servoOsc) return;
    const now = this.ctx.currentTime;
    this.servoGain.gain.setTargetAtTime(active ? 0.06 : 0, now, 0.05);
    if (active) {
      this.servoOsc.frequency.setValueAtTime(750 + Math.random() * 200, now);
    }
  }

  public setDrillActive(active: boolean) {
    if (!this.ctx || this.isMuted || !this.drillGain) return;
    const now = this.ctx.currentTime;
    this.drillGain.gain.setTargetAtTime(active ? 0.12 : 0, now, 0.08);
  }

  public playThud(intensity: number = 0.5) {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80 * (0.8 + Math.random() * 0.4), now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.12);

    gain.gain.setValueAtTime(Math.min(0.3, intensity * 0.25), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playDeploymentChime() {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.08, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.45);
    });
  }

  public dispose() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

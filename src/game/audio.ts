import type { GameState } from "./state";

export type LoopSoundId = "footsteps" | "engine" | "slew" | "hydraulicBoom" | "hydraulicStick" | "hydraulicBucket";
export type OneShotSoundId = "jump";

export interface SoundState {
  loops: Record<LoopSoundId, boolean>;
  oneshots: OneShotSoundId[];
}

type AudioContextLike = AudioContext;

interface LoopNode {
  oscillator: OscillatorNode;
  gain: GainNode;
  enabled: boolean;
}

const LOOP_DEFAULTS: Record<LoopSoundId, { frequency: number; type: OscillatorType; volume: number }> = {
  footsteps: { frequency: 7, type: "square", volume: 0.035 },
  engine: { frequency: 58, type: "sawtooth", volume: 0.055 },
  slew: { frequency: 130, type: "triangle", volume: 0.04 },
  hydraulicBoom: { frequency: 190, type: "sawtooth", volume: 0.035 },
  hydraulicStick: { frequency: 230, type: "triangle", volume: 0.032 },
  hydraulicBucket: { frequency: 280, type: "triangle", volume: 0.028 }
};

export class GameAudioController {
  private context?: AudioContextLike;
  private master?: GainNode;
  private readonly loops = new Map<LoopSoundId, LoopNode>();
  private enabled = false;
  private lastOneshotKeys = new Set<OneShotSoundId>();

  constructor(private readonly createContext: () => AudioContextLike = () => new AudioContext()) {}

  getDebugState(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      contextState: this.context?.state ?? "not-created",
      activeLoops: [...this.loops.entries()].filter(([, node]) => node.enabled).map(([id]) => id)
    };
  }

  async unlock(): Promise<void> {
    this.ensureContext();
    if (this.context?.state === "suspended") {
      await this.context.resume();
    }
    this.enabled = true;
  }

  update(sound: SoundState): void {
    if (!this.enabled) {
      return;
    }

    this.ensureContext();
    if (!this.context || !this.master) {
      return;
    }

    for (const id of Object.keys(sound.loops) as LoopSoundId[]) {
      this.setLoop(id, sound.loops[id]);
    }

    for (const id of sound.oneshots) {
      if (!this.lastOneshotKeys.has(id)) {
        this.playOneShot(id);
      }
    }
    this.lastOneshotKeys = new Set(sound.oneshots);
  }

  dispose(): void {
    for (const node of this.loops.values()) {
      node.oscillator.stop();
      node.oscillator.disconnect();
      node.gain.disconnect();
    }
    this.loops.clear();
    this.master?.disconnect();
    void this.context?.close();
    this.enabled = false;
  }

  private ensureContext(): void {
    if (this.context) {
      return;
    }

    this.context = this.createContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.context.destination);
  }

  private setLoop(id: LoopSoundId, enabled: boolean): void {
    if (!this.context || !this.master) {
      return;
    }

    let node = this.loops.get(id);
    if (!node) {
      const defaults = LOOP_DEFAULTS[id];
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = defaults.type;
      oscillator.frequency.value = defaults.frequency;
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start();
      node = { oscillator, gain, enabled: false };
      this.loops.set(id, node);
    }

    if (node.enabled === enabled) {
      return;
    }

    node.enabled = enabled;
    const target = enabled ? LOOP_DEFAULTS[id].volume : 0;
    const now = this.context.currentTime;
    node.gain.gain.cancelScheduledValues(now);
    node.gain.gain.setTargetAtTime(target, now, 0.045);
  }

  private playOneShot(id: OneShotSoundId): void {
    if (!this.context || !this.master) {
      return;
    }

    if (id === "jump") {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(240, this.context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(520, this.context.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.16);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start();
      oscillator.stop(this.context.currentTime + 0.18);
    }
  }
}

export function deriveSoundState(previous: GameState, current: GameState): SoundState {
  return {
    loops: {
      footsteps: current.mode === "onFoot" && current.player.moving,
      engine: current.mode === "driving" && movedXZ(previous.excavator.position, current.excavator.position),
      slew: current.mode === "driving" && changed(previous.excavator.upperRotation, current.excavator.upperRotation),
      hydraulicBoom: current.mode === "driving" && changed(previous.excavator.boomAngle, current.excavator.boomAngle),
      hydraulicStick: current.mode === "driving" && changed(previous.excavator.stickAngle, current.excavator.stickAngle),
      hydraulicBucket: current.mode === "driving" && changed(previous.excavator.bucketAngle, current.excavator.bucketAngle)
    },
    oneshots: previous.player.grounded && !current.player.grounded ? ["jump"] : []
  };
}

function movedXZ(previous: { x: number; z: number }, current: { x: number; z: number }): boolean {
  return Math.hypot(current.x - previous.x, current.z - previous.z) > 0.0001;
}

function changed(previous: number, current: number): boolean {
  return Math.abs(current - previous) > 0.0001;
}

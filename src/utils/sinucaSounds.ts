// Sinuca Sound System

export interface SoundConfig {
  enabled: boolean;
  volume: number;
}

export type SoundType = 
  | 'ball_hit'
  | 'pocket' 
  | 'rail'
  | 'break'
  | 'game_start'
  | 'game_end'
  | 'foul'
  | 'applause';

class SinucaSoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private config: SoundConfig = { enabled: true, volume: 0.7 };
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.loadSounds();
      this.initialized = true;
      console.log('🔊 Sinuca sound system initialized');
    } catch (error) {
      console.warn('Sound system failed to initialize:', error);
    }
  }

  private async loadSounds(): Promise<void> {
    const soundMap: Record<SoundType, string> = {
      ball_hit: this.generateBallHitSound(),
      pocket: this.generatePocketSound(),
      rail: this.generateRailSound(),
      break: this.generateBreakSound(),
      game_start: this.generateGameStartSound(),
      game_end: this.generateGameEndSound(),
      foul: this.generateFoulSound(),
      applause: this.generateApplauseSound()
    };

    for (const [soundType, soundData] of Object.entries(soundMap)) {
      try {
        const buffer = await this.createSoundBuffer(soundData);
        this.sounds.set(soundType as SoundType, buffer);
      } catch (error) {
        console.warn(`Failed to load sound: ${soundType}`, error);
      }
    }
  }

  private async createSoundBuffer(soundType: string): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    // Create procedural sounds since we don't have audio files
    switch (soundType) {
      case 'ball_hit':
        return this.createBallHitBuffer();
      case 'pocket':
        return this.createPocketBuffer();
      case 'rail':
        return this.createRailBuffer();
      case 'break':
        return this.createBreakBuffer();
      case 'game_start':
        return this.createGameStartBuffer();
      case 'game_end':
        return this.createGameEndBuffer();
      case 'foul':
        return this.createFoulBuffer();
      case 'applause':
        return this.createApplauseBuffer();
      default:
        return this.createBallHitBuffer();
    }
  }

  private createBallHitBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 0.1;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate a short click sound with some white noise
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30); // Quick decay
      const noise = (Math.random() * 2 - 1) * 0.3;
      const click = Math.sin(2 * Math.PI * 1000 * t) * 0.5;
      data[i] = (click + noise) * envelope;
    }

    return buffer;
  }

  private createPocketBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 0.3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate a hollow "plop" sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8) * (1 - Math.exp(-t * 20));
      const freq = 150 - t * 50; // Descending frequency
      const wave = Math.sin(2 * Math.PI * freq * t);
      data[i] = wave * envelope * 0.6;
    }

    return buffer;
  }

  private createRailBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 0.15;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate a sharp knock sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 15);
      const freq = 800 + Math.sin(t * 40) * 200;
      const wave = Math.sin(2 * Math.PI * freq * t);
      data[i] = wave * envelope * 0.4;
    }

    return buffer;
  }

  private createBreakBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 0.5;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate multiple ball collision sounds
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      
      // Layer multiple impacts
      for (let j = 0; j < 5; j++) {
        const delay = j * 0.02;
        if (t > delay) {
          const localT = t - delay;
          const envelope = Math.exp(-localT * 20) * (1 - j * 0.1);
          const freq = 800 + j * 200 + Math.random() * 100;
          sample += Math.sin(2 * Math.PI * freq * localT) * envelope;
        }
      }
      
      data[i] = Math.tanh(sample * 0.3); // Soft clipping
    }

    return buffer;
  }

  private createGameStartBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 0.8;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate an ascending musical phrase
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noteIndex = Math.floor(t * 4);
      const freq = notes[Math.min(noteIndex, notes.length - 1)];
      const envelope = Math.sin(t * Math.PI) * 0.3;
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope;
    }

    return buffer;
  }

  private createGameEndBuffer(): AudioBuffer {
    return this.createGameStartBuffer(); // Reuse for now
  }

  private createFoulBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 0.3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate a descending "whomp" sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3);
      const freq = 200 - t * 150;
      const wave = Math.sin(2 * Math.PI * freq * t);
      data[i] = wave * envelope * 0.5;
    }

    return buffer;
  }

  private createApplauseBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 2.0;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate applause with random noise bursts
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(t * Math.PI * 0.5) * 0.3;
      const noise = (Math.random() * 2 - 1);
      const filtered = noise * (Math.random() > 0.7 ? 1 : 0.1); // Clappy texture
      data[i] = filtered * envelope;
    }

    return buffer;
  }

  // Placeholder method signatures for the procedural sound generation
  private generateBallHitSound(): string { return 'ball_hit'; }
  private generatePocketSound(): string { return 'pocket'; }
  private generateRailSound(): string { return 'rail'; }
  private generateBreakSound(): string { return 'break'; }
  private generateGameStartSound(): string { return 'game_start'; }
  private generateGameEndSound(): string { return 'game_end'; }
  private generateFoulSound(): string { return 'foul'; }
  private generateApplauseSound(): string { return 'applause'; }

  async playSound(soundType: SoundType, volume: number = 1): Promise<void> {
    if (!this.config.enabled || !this.audioContext || !this.initialized) {
      return;
    }

    const buffer = this.sounds.get(soundType);
    if (!buffer) {
      console.warn(`Sound not found: ${soundType}`);
      return;
    }

    try {
      // Resume audio context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      gainNode.gain.value = this.config.volume * volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
      
      // Clean up
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
      
    } catch (error) {
      console.warn(`Failed to play sound: ${soundType}`, error);
    }
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getVolume(): number {
    return this.config.volume;
  }

  // Enable user interaction to initialize audio context
  async enableAudio(): Promise<void> {
    if (!this.audioContext && !this.initialized) {
      await this.initialize();
    }
  }
}

export const sinucaSounds = new SinucaSoundManager();

// Auto-initialize on first user interaction
export const initializeSoundsOnInteraction = () => {
  const handler = () => {
    sinucaSounds.enableAudio();
    document.removeEventListener('click', handler);
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('keydown', handler);
  };

  document.addEventListener('click', handler);
  document.addEventListener('touchstart', handler);
  document.addEventListener('keydown', handler);
};
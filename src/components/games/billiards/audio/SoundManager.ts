import { SoundConfig } from '../types/GameTypes';

export class SoundManager {
  private enabled: boolean;
  private volume: number = 1.0;
  private audioContext: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();

  private soundUrls = {
    hit: '/assets/sounds/pool-hit.mp3',
    pocket: '/assets/sounds/pool-pocket.mp3',
    rail: '/assets/sounds/pool-rail.mp3',
    break: '/assets/sounds/pool-break.mp3'
  };

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  async initialize(): Promise<void> {
    if (!this.enabled) return;

    try {
      // Create audio context (will be resumed on first user interaction)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load sound files
      await this.loadSounds();
      
      console.log('🔊 Sound Manager initialized');
    } catch (error) {
      console.warn('Sound Manager initialization failed:', error);
      this.enabled = false;
    }
  }

  private async loadSounds(): Promise<void> {
    const loadPromises = Object.entries(this.soundUrls).map(async ([name, url]) => {
      try {
        const buffer = await this.loadSound(url);
        this.soundBuffers.set(name, buffer);
        console.log(`🔊 Loaded sound: ${name}`);
      } catch (error) {
        console.warn(`Failed to load sound ${name}:`, error);
      }
    });

    await Promise.allSettled(loadPromises);
  }

  private async loadSound(url: string): Promise<AudioBuffer> {
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const promise = new Promise<AudioBuffer>(async (resolve, reject) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        resolve(audioBuffer);
      } catch (error) {
        reject(error);
      }
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  public async playSound(soundName: string, intensity: number = 1.0): Promise<void> {
    if (!this.enabled || !this.audioContext) return;

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Could not resume audio context:', error);
        return;
      }
    }

    const buffer = this.soundBuffers.get(soundName);
    if (!buffer) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }

    try {
      // Create and configure audio source
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      
      // Apply volume and intensity
      const finalVolume = this.volume * Math.max(0.1, Math.min(1.0, intensity));
      gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
      
      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Add slight random pitch variation for more natural sound
      const pitchVariation = 1 + (Math.random() - 0.5) * 0.1;
      source.playbackRate.setValueAtTime(pitchVariation, this.audioContext.currentTime);
      
      // Play sound
      source.start(0);
      
    } catch (error) {
      console.warn(`Error playing sound ${soundName}:`, error);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled && this.audioContext) {
      this.audioContext.suspend();
    } else if (enabled && this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public getEnabled(): boolean {
    return this.enabled;
  }

  public getVolume(): number {
    return this.volume;
  }

  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.soundBuffers.clear();
    this.loadingPromises.clear();
  }
}
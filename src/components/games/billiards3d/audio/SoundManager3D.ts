export class SoundManager3D {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  async initialize(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load sound effects
      await this.loadSounds();
      
      console.log('🔊 SoundManager3D initialized');
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  }

  private async loadSounds(): Promise<void> {
    const soundUrls = {
      hit: '/assets/sounds/ball-hit.mp3',
      pocket: '/assets/sounds/ball-pocket.mp3',
      cushion: '/assets/sounds/ball-cushion.mp3'
    };

    const loadPromises = Object.entries(soundUrls).map(async ([name, url]) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.sounds.set(name, audioBuffer);
      } catch (error) {
        console.warn(`Failed to load sound ${name}:`, error);
        // Create a simple beep as fallback
        this.createBeepSound(name);
      }
    });

    await Promise.all(loadPromises);
  }

  private createBeepSound(name: string): void {
    if (!this.audioContext) return;

    const duration = 0.1;
    const frequency = name === 'hit' ? 800 : name === 'pocket' ? 400 : 600;
    
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      data[i] = Math.sin(2 * Math.PI * frequency * i / this.audioContext.sampleRate) * 0.3;
    }
    
    this.sounds.set(name, buffer);
  }

  public playSound(name: string, volume: number = 1.0): void {
    if (!this.enabled || !this.audioContext || !this.sounds.has(name)) {
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = this.sounds.get(name)!;
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.sounds.clear();
  }
}
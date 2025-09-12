// Pool table textures and assets loader
interface TextureCache {
  wood?: HTMLImageElement;
  feltNoise?: HTMLImageElement;
  logo?: HTMLImageElement;
  woodPattern?: CanvasPattern;
  feltPattern?: CanvasPattern;
}

export class TextureManager {
  private cache: TextureCache = {};
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  async loadImage(url: string): Promise<HTMLImageElement> {
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  async loadAll(): Promise<void> {
    try {
      const [wood, feltNoise, logo] = await Promise.all([
        this.loadImage('/assets/pool/wood.jpg'),
        this.loadImage('/assets/pool/felt-noise.png'),
        this.loadImage('/assets/brand/trembao-logo.png')
      ]);

      this.cache.wood = wood;
      this.cache.feltNoise = feltNoise;
      this.cache.logo = logo;
    } catch (error) {
      console.warn('Some textures failed to load:', error);
    }
  }

  createWoodPattern(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): CanvasPattern | null {
    if (this.cache.woodPattern) return this.cache.woodPattern;
    
    if (this.cache.wood) {
      this.cache.woodPattern = ctx.createPattern(this.cache.wood, 'repeat');
      return this.cache.woodPattern;
    }
    return null;
  }

  createFeltNoisePattern(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): CanvasPattern | null {
    if (this.cache.feltPattern) return this.cache.feltPattern;
    
    if (this.cache.feltNoise) {
      this.cache.feltPattern = ctx.createPattern(this.cache.feltNoise, 'repeat');
      return this.cache.feltPattern;
    }
    return null;
  }

  getWoodTexture(): HTMLImageElement | null {
    return this.cache.wood || null;
  }

  getFeltNoiseTexture(): HTMLImageElement | null {
    return this.cache.feltNoise || null;
  }

  getLogoTexture(): HTMLImageElement | null {
    return this.cache.logo || null;
  }

  // Create table felt gradient
  createFeltGradient(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number): CanvasGradient {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.8
    );
    
    gradient.addColorStop(0, '#0F3128'); // Center - slightly lighter
    gradient.addColorStop(0.6, '#0D2A22'); // Mid
    gradient.addColorStop(1, '#0A211C'); // Edges - darker
    
    return gradient;
  }

  // Create pocket gradient for depth effect
  createPocketGradient(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, radius: number): CanvasGradient {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.7, '#111111');
    gradient.addColorStop(0.9, '#333333');
    gradient.addColorStop(1, '#555555');
    
    return gradient;
  }

  dispose(): void {
    this.cache = {};
    this.loadingPromises.clear();
  }
}

export const textureManager = new TextureManager();
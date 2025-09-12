// Pool ball sprite factory with realistic rendering
interface BallConfig {
  number: number;
  color: string;
  isStripe: boolean;
  isEightBall: boolean;
  isCueBall: boolean;
}

export class BallFactory {
  private spriteCache: Map<string, OffscreenCanvas> = new Map();
  private ballConfigs: Map<number, BallConfig> = new Map();

  constructor() {
    this.initializeBallConfigs();
  }

  private initializeBallConfigs(): void {
    // Ball color mapping (hex colors as specified)
    const ballColors = {
      1: '#F2D22E', // Yellow
      2: '#2467D1', // Blue  
      3: '#D33B2D', // Red
      4: '#7B22A4', // Purple
      5: '#F28C16', // Orange
      6: '#258D54', // Green
      7: '#8B1C1C', // Maroon
      8: '#000000', // Black
      9: '#F2D22E', // Yellow stripe
      10: '#2467D1', // Blue stripe
      11: '#D33B2D', // Red stripe
      12: '#7B22A4', // Purple stripe
      13: '#F28C16', // Orange stripe
      14: '#258D54', // Green stripe
      15: '#8B1C1C', // Maroon stripe
    };

    // Configure each ball
    for (let i = 1; i <= 15; i++) {
      this.ballConfigs.set(i, {
        number: i,
        color: ballColors[i as keyof typeof ballColors],
        isStripe: i > 8,
        isEightBall: i === 8,
        isCueBall: false
      });
    }

    // Cue ball (0)
    this.ballConfigs.set(0, {
      number: 0,
      color: '#F5F5F5',
      isStripe: false,
      isEightBall: false,
      isCueBall: true
    });
  }

  getBallSprite(ballNumber: number, diameter: number, dpr: number = 1): OffscreenCanvas {
    const key = `${ballNumber}-${diameter}-${dpr}`;
    
    if (this.spriteCache.has(key)) {
      return this.spriteCache.get(key)!;
    }

    const sprite = this.createBallSprite(ballNumber, diameter, dpr);
    this.spriteCache.set(key, sprite);
    return sprite;
  }

  private createBallSprite(ballNumber: number, diameter: number, dpr: number): OffscreenCanvas {
    const config = this.ballConfigs.get(ballNumber);
    if (!config) {
      throw new Error(`Unknown ball number: ${ballNumber}`);
    }

    const size = Math.ceil(diameter * dpr);
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d')!;
    
    const radius = size / 2;
    const center = radius;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw shadow (elliptical, below ball)
    this.drawBallShadow(ctx, center, center + radius * 0.15, radius * 0.85, radius * 0.3);

    // Draw ball base with gradient
    this.drawBallBase(ctx, center, center, radius * 0.95, config);

    // Draw stripe if needed
    if (config.isStripe && !config.isEightBall) {
      this.drawStripe(ctx, center, center, radius * 0.95, config);
    }

    // Draw number
    if (!config.isCueBall) {
      this.drawBallNumber(ctx, center, center, radius * 0.95, config);
    }

    // Draw specular highlight
    this.drawSpecularHighlight(ctx, center - radius * 0.3, center - radius * 0.3, radius * 0.25, config);

    // Draw subtle border
    this.drawBallBorder(ctx, center, center, radius * 0.95);

    return canvas;
  }

  private drawBallShadow(ctx: OffscreenCanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000000';
    
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  private drawBallBase(ctx: OffscreenCanvasRenderingContext2D, cx: number, cy: number, radius: number, config: BallConfig): void {
    // Create radial gradient for 3D effect
    const gradient = ctx.createRadialGradient(
      cx - radius * 0.3, cy - radius * 0.3, 0,
      cx, cy, radius
    );

    if (config.isCueBall) {
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.7, config.color);
      gradient.addColorStop(1, '#E0E0E0');
    } else {
      const baseColor = config.color;
      const lighterColor = this.lightenColor(baseColor, 0.3);
      const darkerColor = this.darkenColor(baseColor, 0.2);
      
      gradient.addColorStop(0, lighterColor);
      gradient.addColorStop(0.7, baseColor);
      gradient.addColorStop(1, darkerColor);
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStripe(ctx: OffscreenCanvasRenderingContext2D, cx: number, cy: number, radius: number, config: BallConfig): void {
    const stripeHeight = radius * 0.8; // 40% of diameter
    const stripeY = cy - stripeHeight / 2;

    ctx.save();
    
    // Clip to ball circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Draw white stripe
    const gradient = ctx.createLinearGradient(cx, stripeY, cx, stripeY + stripeHeight);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.5, '#F8F8F8');
    gradient.addColorStop(1, '#FFFFFF');

    ctx.fillStyle = gradient;
    ctx.fillRect(cx - radius, stripeY, radius * 2, stripeHeight);
    
    ctx.restore();
  }

  private drawBallNumber(ctx: OffscreenCanvasRenderingContext2D, cx: number, cy: number, radius: number, config: BallConfig): void {
    const fontSize = Math.max(10, radius * 0.4);
    
    // Draw number background circle (white disc with transparency)
    if (!config.isStripe) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw number text
    ctx.save();
    ctx.fillStyle = config.isEightBall ? '#FFFFFF' : '#111111';
    ctx.font = `900 ${fontSize}px Inter, Montserrat, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.number.toString(), cx, cy);
    ctx.restore();
  }

  private drawSpecularHighlight(ctx: OffscreenCanvasRenderingContext2D, cx: number, cy: number, radius: number, config: BallConfig): void {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    
    const alpha = config.isCueBall ? 0.8 : 0.6;
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    gradient.addColorStop(0.3, `rgba(255, 255, 255, ${alpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBallBorder(ctx: OffscreenCanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private lightenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.round(255 * factor));
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.round(255 * factor));
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.round(255 * factor));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private darkenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(255 * factor));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(255 * factor));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(255 * factor));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  dispose(): void {
    this.spriteCache.clear();
  }
}

export const ballFactory = new BallFactory();
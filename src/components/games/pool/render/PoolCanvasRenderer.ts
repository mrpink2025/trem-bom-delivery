// Professional Pool Canvas 2D Renderer
import { ballFactory, BallFactory } from './sprites/BallFactory';
import { textureManager, TextureManager } from './assets/textures';

interface Ball {
  id: number;
  number: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  inPocket?: boolean;
  type?: string;
}

interface PoolFrame {
  t: number;
  balls: Ball[];
  sounds?: string[];
}

interface TableDimensions {
  width: number;
  height: number;
  railWidth: number;
  pocketRadius: number;
}

interface TableThemeOptions {
  feltColor?: string;
  railWoodTexture?: boolean;
  showLogo?: boolean;
  logoOpacity?: number;
}

export class PoolCanvasRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr: number = 1;
  private animationId: number | null = null;
  
  // Table configuration
  private table: TableDimensions = {
    width: 2240,
    height: 1120,
    railWidth: 44,
    pocketRadius: 32
  };
  
  // Playable area boundaries (inside rails)
  private get playableBounds() {
    return {
      left: this.table.railWidth,
      top: this.table.railWidth,
      right: this.table.width - this.table.railWidth,
      bottom: this.table.height - this.table.railWidth
    };
  }
  
  private options: TableThemeOptions = {
    feltColor: '#0F3128',
    railWoodTexture: true,
    showLogo: true,
    logoOpacity: 0.06
  };

  // Animation state
  private frames: PoolFrame[] = [];
  private currentFrameIndex: number = 0;
  private lastFrameTime: number = 0;
  private isAnimating: boolean = false;
  private frameInterpolationFactor: number = 0;

  // Performance tracking
  private fpsCounter: number = 0;
  private lastFpsTime: number = 0;
  private currentFps: number = 60;

  // Cache
  private tableCache: OffscreenCanvas | null = null;
  private pocketPositions: Array<{x: number, y: number}> = [];

  async init(canvas: HTMLCanvasElement, opts: TableThemeOptions = {}): Promise<void> {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    if (!this.ctx) {
      throw new Error('Failed to get 2D rendering context');
    }

    this.options = { ...this.options, ...opts };
    this.dpr = window.devicePixelRatio || 1;
    
    // Load textures
    await textureManager.loadAll();
    console.log('🎱 Pool renderer initialized with DPR:', this.dpr);
    
    this.setupCanvas();
    this.precalculatePockets();
    this.preRenderTable();
  }

  private setupCanvas(): void {
    if (!this.canvas || !this.ctx) return;

    const container = this.canvas.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const aspectRatio = this.table.width / this.table.height;
    
    let displayWidth = containerRect.width;
    let displayHeight = containerRect.width / aspectRatio;
    
    if (displayHeight > containerRect.height) {
      displayHeight = containerRect.height;
      displayWidth = containerRect.height * aspectRatio;
    }

    // Set display size
    this.canvas.style.width = displayWidth + 'px';
    this.canvas.style.height = displayHeight + 'px';
    
    // Set actual size in memory (accounting for device pixel ratio)
    this.canvas.width = Math.floor(displayWidth * this.dpr);
    this.canvas.height = Math.floor(displayHeight * this.dpr);
    
    // Scale the drawing context so everything draws at the correct size
    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  private precalculatePockets(): void {
    const { width, height, pocketRadius } = this.table;
    const margin = pocketRadius;
    
    this.pocketPositions = [
      { x: margin, y: margin }, // Top left
      { x: width / 2, y: margin }, // Top center  
      { x: width - margin, y: margin }, // Top right
      { x: margin, y: height - margin }, // Bottom left
      { x: width / 2, y: height - margin }, // Bottom center
      { x: width - margin, y: height - margin }, // Bottom right
    ];
  }

  private preRenderTable(): void {
    if (!this.canvas) return;

    const { width, height } = this.table;
    this.tableCache = new OffscreenCanvas(width, height);
    const ctx = this.tableCache.getContext('2d')!;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    this.renderTableSurface(ctx, width, height);
    this.renderRails(ctx, width, height);
    this.renderPockets(ctx);
    this.renderLogo(ctx, width, height);
  }

  private renderTableSurface(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
    const { railWidth } = this.table;
    const playAreaX = railWidth;
    const playAreaY = railWidth;
    const playAreaWidth = width - railWidth * 2;
    const playAreaHeight = height - railWidth * 2;

    // Draw felt base with gradient
    const feltGradient = textureManager.createFeltGradient(ctx, playAreaWidth, playAreaHeight);
    ctx.fillStyle = feltGradient;
    ctx.fillRect(playAreaX, playAreaY, playAreaWidth, playAreaHeight);

    // Apply felt noise texture
    const feltNoise = textureManager.createFeltNoisePattern(ctx);
    if (feltNoise) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = feltNoise;
      ctx.fillRect(playAreaX, playAreaY, playAreaWidth, playAreaHeight);
      ctx.restore();
    }
  }

  private renderRails(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
    const { railWidth } = this.table;
    
    // Create wood pattern or fallback to brown gradient
    const woodPattern = textureManager.createWoodPattern(ctx);
    let fillStyle: string | CanvasPattern | CanvasGradient;
    
    if (woodPattern && this.options.railWoodTexture) {
      fillStyle = woodPattern;
    } else {
      const woodGradient = ctx.createLinearGradient(0, 0, 0, railWidth);
      woodGradient.addColorStop(0, '#8B4513');
      woodGradient.addColorStop(0.5, '#A0522D');
      woodGradient.addColorStop(1, '#654321');
      fillStyle = woodGradient;
    }

    ctx.fillStyle = fillStyle;
    
    // Top rail
    this.drawRoundedRect(ctx, 0, 0, width, railWidth, 12);
    ctx.fill();
    
    // Bottom rail  
    this.drawRoundedRect(ctx, 0, height - railWidth, width, railWidth, 12);
    ctx.fill();
    
    // Left rail
    this.drawRoundedRect(ctx, 0, railWidth, railWidth, height - railWidth * 2, 12);
    ctx.fill();
    
    // Right rail
    this.drawRoundedRect(ctx, width - railWidth, railWidth, railWidth, height - railWidth * 2, 12);
    ctx.fill();

    // Add inner shadow to rails
    this.addRailShadows(ctx, width, height, railWidth);
  }

  private addRailShadows(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number, railWidth: number): void {
    const shadowSize = 8;
    const shadowGradient = ctx.createLinearGradient(0, 0, 0, shadowSize);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = shadowGradient;
    
    // Top shadow
    ctx.fillRect(railWidth, railWidth, width - railWidth * 2, shadowSize);
    
    // Bottom shadow  
    ctx.save();
    ctx.scale(1, -1);
    ctx.fillRect(railWidth, -(height - railWidth), width - railWidth * 2, shadowSize);
    ctx.restore();
    
    // Left shadow
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    ctx.fillRect(-height + railWidth, railWidth, height - railWidth * 2, shadowSize);
    ctx.restore();
    
    // Right shadow
    ctx.save();
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(railWidth, -(width - railWidth), height - railWidth * 2, shadowSize);
    ctx.restore();
  }

  private renderPockets(ctx: OffscreenCanvasRenderingContext2D): void {
    const { pocketRadius } = this.table;
    
    this.pocketPositions.forEach(pocket => {
      const gradient = textureManager.createPocketGradient(ctx, pocketRadius);
      
      ctx.save();
      ctx.translate(pocket.x, pocket.y);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, pocketRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Add rim highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.restore();
    });
  }

  private renderLogo(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
    if (!this.options.showLogo) return;
    
    const logo = textureManager.getLogoTexture();
    if (!logo) return;

    // Enhanced logo positioning and sizing for better visibility
    const logoWidth = width * 0.35; // Slightly smaller for better proportion
    const logoHeight = (logoWidth * logo.height) / logo.width;
    const logoX = (width - logoWidth) / 2;
    const logoY = (height - logoHeight) / 2;

    ctx.save();
    ctx.globalAlpha = 0.10; // Slightly more visible
    ctx.globalCompositeOperation = 'multiply'; // Better blend mode for dark logo
    
    // Enhanced blur for better integration
    try {
      ctx.filter = 'blur(1.5px)';
    } catch (e) {
      // Filter not supported, continue without blur
    }
    
    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    ctx.restore();
  }

  private drawRoundedRect(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  renderFrame(framesOrState: PoolFrame[] | PoolFrame | Ball[]): void {
    if (!this.ctx || !this.canvas) return;

    // Handle different input types
    let currentFrame: PoolFrame;
    
    if (Array.isArray(framesOrState)) {
      if (framesOrState.length === 0) return;
      
      // Check if it's an array of balls or frames
      if ('t' in framesOrState[0]) {
        // Array of frames - start animation
        this.frames = framesOrState as PoolFrame[];
        this.startAnimation();
        return;
      } else {
        // Array of balls - render static
        currentFrame = { t: 0, balls: framesOrState as Ball[] };
      }
    } else if ('t' in framesOrState) {
      // Single frame
      currentFrame = framesOrState as PoolFrame;
    } else {
      // Assume it's balls array
      currentFrame = { t: 0, balls: framesOrState as Ball[] };
    }

    this.renderStaticFrame(currentFrame);
  }

  private startAnimation(): void {
    if (this.frames.length === 0) return;
    
    this.isAnimating = true;
    this.currentFrameIndex = 0;
    this.lastFrameTime = performance.now();
    
    const animate = (currentTime: number) => {
      if (!this.isAnimating) return;
      
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;
      
      // Update FPS counter
      this.updateFpsCounter(currentTime);
      
      // Interpolate between frames
      const frame = this.getInterpolatedFrame(currentTime);
      if (frame) {
        this.renderStaticFrame(frame);
      }
      
      // Continue animation
      if (this.currentFrameIndex < this.frames.length - 1 || this.frameInterpolationFactor < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
      }
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  private getInterpolatedFrame(currentTime: number): PoolFrame | null {
    if (this.frames.length === 0) return null;
    
    const frameDuration = 1000 / 60; // 60fps
    const animationTime = currentTime - this.lastFrameTime + (this.currentFrameIndex * frameDuration);
    
    // Calculate current frame and interpolation
    const frameTime = animationTime / frameDuration;
    const frameIndex = Math.floor(frameTime);
    this.frameInterpolationFactor = frameTime - frameIndex;
    
    if (frameIndex >= this.frames.length - 1) {
      return this.frames[this.frames.length - 1];
    }
    
    this.currentFrameIndex = frameIndex;
    const currentFrame = this.frames[frameIndex];
    const nextFrame = this.frames[frameIndex + 1];
    
    if (!nextFrame || this.frameInterpolationFactor === 0) {
      return currentFrame;
    }
    
    // Enhanced interpolation with easing for more natural movement
    const easedFactor = this.easeInOutCubic(this.frameInterpolationFactor);
    
    // Interpolate ball positions with enhanced physics
    const interpolatedBalls = currentFrame.balls.map(ball => {
      const nextBall = nextFrame.balls.find(b => b.id === ball.id);
      if (!nextBall) return ball;
      
      return {
        ...ball,
        x: this.lerp(ball.x, nextBall.x, easedFactor),
        y: this.lerp(ball.y, nextBall.y, easedFactor),
        vx: this.lerp(ball.vx || 0, nextBall.vx || 0, easedFactor),
        vy: this.lerp(ball.vy || 0, nextBall.vy || 0, easedFactor),
      };
    });
    
    return {
      t: this.lerp(currentFrame.t, nextFrame.t, easedFactor),
      balls: interpolatedBalls,
      sounds: currentFrame.sounds
    };
  }
  
  // Smooth easing function for more natural animations
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private renderStaticFrame(frame: PoolFrame): void {
    if (!this.ctx || !this.canvas) return;
    
    const scaleX = this.canvas.width / this.dpr / this.table.width;
    const scaleY = this.canvas.height / this.dpr / this.table.height;
    
    this.ctx.save();
    this.ctx.scale(scaleX, scaleY);
    
    // Clear and draw table
    this.ctx.clearRect(0, 0, this.table.width, this.table.height);
    
    if (this.tableCache) {
      this.ctx.drawImage(this.tableCache, 0, 0);
    }
    
    // Draw balls with motion blur and effects
    this.renderBalls(frame.balls);
    
    this.ctx.restore();
    
    // Draw HUD (not scaled)
    this.renderHUD(frame);
  }

  private renderBalls(balls: Ball[]): void {
    if (!this.ctx) return;
    
    // Responsive ball size - larger and more proportional to table
    const ballDiameter = Math.max(45, this.table.width / 50); // More realistic size
    
    balls.forEach(ball => {
      if (ball.inPocket) return;
      
      // Enhanced motion blur with better physics
      const speed = Math.sqrt((ball.vx || 0) ** 2 + (ball.vy || 0) ** 2);
      const shouldBlur = speed > 2; // Lower threshold for more responsive blur
      
      // Ensure balls stay within playable bounds
      const bounds = this.playableBounds;
      const ballRadius = ballDiameter / 2;
      const constrainedX = Math.max(bounds.left + ballRadius, Math.min(bounds.right - ballRadius, ball.x));
      const constrainedY = Math.max(bounds.top + ballRadius, Math.min(bounds.bottom - ballRadius, ball.y));
      
      // Enhanced motion blur with direction-based trails
      if (shouldBlur && ball.vx !== undefined && ball.vy !== undefined) {
        const blurSteps = Math.min(4, Math.ceil(speed / 3)); // Dynamic blur steps
        const blurDistance = Math.min(speed * 0.6, 25); // Longer trails for faster balls
        const direction = Math.atan2(ball.vy, ball.vx);
        
        for (let i = 1; i <= blurSteps; i++) {
          const factor = i / blurSteps;
          const distance = blurDistance * factor;
          const ghostX = constrainedX - Math.cos(direction) * distance;
          const ghostY = constrainedY - Math.sin(direction) * distance;
          
          this.ctx.save();
          this.ctx.globalAlpha = 0.12 * (1 - factor * 0.7); // Stronger blur trails
          this.renderSingleBall(ball.number, ghostX, ghostY, ballDiameter, speed * factor);
          this.ctx.restore();
        }
      }
      
      // Draw main ball with physics-based rotation
      const rotation = speed > 0.1 ? Math.atan2(ball.vy || 0, ball.vx || 0) : 0;
      this.renderSingleBall(ball.number, constrainedX, constrainedY, ballDiameter, speed, rotation);
    });
  }

  private renderSingleBall(ballNumber: number, x: number, y: number, diameter: number, speed: number = 0, rotation: number = 0): void {
    if (!this.ctx) return;
    
    const sprite = ballFactory.getBallSprite(ballNumber, diameter, this.dpr);
    const size = diameter;
    
    this.ctx.save();
    
    // Draw enhanced shadow with physics
    this.drawBallShadow(x, y, size, speed);
    
    // Apply rotation for rolling effect
    if (rotation !== 0 && speed > 0.5) {
      this.ctx.translate(x, y);
      this.ctx.rotate(rotation);
      this.ctx.drawImage(sprite as any, -size / 2, -size / 2, size, size);
    } else {
      this.ctx.drawImage(sprite as any, x - size / 2, y - size / 2, size, size);
    }
    
    this.ctx.restore();
  }
  
  private drawBallShadow(x: number, y: number, size: number, speed: number): void {
    if (!this.ctx) return;
    
    const shadowRadius = size * 0.4;
    const shadowOffset = Math.max(2, speed * 0.3);
    const shadowAlpha = Math.min(0.3, 0.15 + speed * 0.02);
    
    this.ctx.save();
    this.ctx.globalAlpha = shadowAlpha;
    this.ctx.fillStyle = '#000000';
    
    // Dynamic shadow based on ball movement
    const gradient = this.ctx.createRadialGradient(
      x + shadowOffset, y + shadowOffset + size * 0.3, 0,
      x + shadowOffset, y + shadowOffset + size * 0.3, shadowRadius
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.ellipse(x + shadowOffset, y + shadowOffset + size * 0.3, shadowRadius, shadowRadius * 0.6, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private renderHUD(frame: PoolFrame): void {
    if (!this.ctx || !this.canvas) return;
    
    // HUD is rendered in screen coordinates (not scaled)
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    
    // Simple FPS counter (top right)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '12px Inter, sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${Math.round(this.currentFps)} FPS`, width - 10, 20);
    
    // Ball count (top left)
    const activeBalls = frame.balls.filter(ball => !ball.inPocket).length;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Balls: ${activeBalls}`, 10, 20);
    
    this.ctx.restore();
  }

  private updateFpsCounter(currentTime: number): void {
    this.fpsCounter++;
    
    if (currentTime - this.lastFpsTime >= 1000) {
      this.currentFps = this.fpsCounter;
      this.fpsCounter = 0;
      this.lastFpsTime = currentTime;
    }
  }

  resize(): void {
    this.setupCanvas();
    this.preRenderTable();
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.isAnimating = false;
    this.frames = [];
    this.tableCache = null;
    ballFactory.dispose();
    textureManager.dispose();
  }
}

export const poolRenderer = new PoolCanvasRenderer();
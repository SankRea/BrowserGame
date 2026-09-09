import { sitePath } from '../../shared/site.js';
import { CONFIG, SPRITES } from './config.js';

let spritePromise;
export function loadDinoSprite() {
  if (!spritePromise) {
    spritePromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        spritePromise = null;
        reject(new Error('恐龙精灵图加载失败'));
      };
      image.src = sitePath('assets/dino/chromium-sprite.png');
    });
  }
  return spritePromise;
}

function drawSprite(context, image, sprite, x, y, { frame = 0, scale = 1 } = {}) {
  context.drawImage(
    image,
    sprite.x + frame * sprite.width,
    sprite.y,
    sprite.width,
    sprite.height,
    Math.round(x),
    Math.round(y),
    sprite.width * scale,
    sprite.height * scale,
  );
}

/** Canvas rendering only; consumes engine state without mutating it. */
export class DinoRenderer {
  constructor(canvas, image) {
    this.canvas = canvas;
    this.image = image;
    this.context = canvas.getContext('2d');
    if (!this.context) throw new Error('浏览器无法创建 Canvas 画布');
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.max(1, Math.round(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.round(rect.height * ratio));
    this.scale = this.canvas.height / CONFIG.height;
    this.width = this.canvas.width / this.scale;
    this.context.imageSmoothingEnabled = false;
  }

  draw(engine) {
    const context = this.context;
    context.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    context.filter = 'none';
    context.globalAlpha = 1;
    context.fillStyle = engine.night ? '#29303a' : '#ffffff';
    context.fillRect(0, 0, this.width, CONFIG.height);
    context.filter = engine.night ? 'invert(1)' : 'none';

    context.globalAlpha = 0.55;
    for (let i = 0; i < 4; i++) {
      const span = this.width + 140;
      const x = (((((i * span) / 3 + 140 - engine.distance * 0.14) % span) + span) % span) - 70;
      drawSprite(context, this.image, SPRITES.cloud, x, 57 + (i % 3) * 28);
    }
    context.globalAlpha = 1;
    if (engine.night) drawSprite(context, this.image, SPRITES.moon, this.width - 90, 32);

    const offset = engine.distance % SPRITES.ground.width;
    for (let x = -offset; x < this.width; x += SPRITES.ground.width) {
      drawSprite(context, this.image, SPRITES.ground, x, CONFIG.groundY - 1);
    }

    for (const obstacle of engine.obstacles) {
      const sprite = SPRITES[obstacle.type];
      if (obstacle.type === 'bird') {
        drawSprite(context, this.image, sprite, obstacle.x, obstacle.y, {
          frame: Math.floor((engine.elapsed + obstacle.animationOffset) * 6) % 2,
        });
      } else {
        const sourceX = sprite.x + (sprite.width * obstacle.count * (obstacle.count - 1)) / 2;
        context.drawImage(
          this.image,
          sourceX,
          sprite.y,
          obstacle.width,
          sprite.height,
          Math.round(obstacle.x),
          obstacle.y,
          obstacle.width,
          obstacle.height,
        );
      }
    }

    const ducking = engine.ducking && engine.status !== 'over';
    if (ducking) {
      drawSprite(
        context,
        this.image,
        SPRITES.duck,
        CONFIG.playerX,
        CONFIG.groundY - SPRITES.duck.height,
        { frame: Math.floor(engine.elapsed * 8) % 2 },
      );
    } else {
      const sourceOffset =
        engine.status === 'over'
          ? 220
          : !engine.grounded
            ? 0
            : engine.status === 'ready'
              ? 0
              : 88 + (Math.floor(engine.elapsed * 12) % 2) * 44;
      drawSprite(
        context,
        this.image,
        { ...SPRITES.dino, x: SPRITES.dino.x + sourceOffset },
        CONFIG.playerX,
        CONFIG.groundY - SPRITES.dino.height - engine.player.elevation,
      );
    }
    context.filter = 'none';
  }
}

export function drawDinoPreview(canvas, image) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  drawSprite(context, image, SPRITES.cloud, 180, 20);
  drawSprite(context, image, SPRITES.ground, 0, 114);
  drawSprite(context, image, SPRITES.dino, 47, 45, { scale: 1.5 });
  drawSprite(context, image, SPRITES.smallCactus, 210, 81);
}

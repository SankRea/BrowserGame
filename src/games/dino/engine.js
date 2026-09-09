import { CONFIG, OBSTACLE_BOXES, PLAYER_BOXES, SPRITES } from './config.js';

const overlaps = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

/** Pure game state: no Canvas, DOM, storage, or animation scheduling. */
export class DinoEngine {
  constructor({ width = 960, random = Math.random } = {}) {
    this.width = width;
    this.random = random;
    this.reset();
  }

  reset() {
    this.status = 'ready';
    this.elapsed = 0;
    this.distance = 0;
    this.score = 0;
    this.speed = CONFIG.initialSpeed;
    this.cleared = 0;
    this.spawnIn = CONFIG.initialSpawnDelay;
    this.obstacles = [];
    this.player = {
      elevation: 0,
      velocity: 0,
      duckHeld: false,
      jumpReleased: false,
      jumpBuffer: 0,
    };
  }

  start() {
    this.reset();
    this.status = 'running';
  }

  pause() {
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.player.duckHeld = false;
    this.player.jumpReleased = true;
    this.player.jumpBuffer = 0;
  }

  resume() {
    if (this.status === 'paused') this.status = 'running';
  }

  get grounded() {
    return this.player.elevation <= 0;
  }
  get ducking() {
    return this.grounded && this.player.duckHeld;
  }
  get night() {
    return Math.floor(this.score / CONFIG.nightCycleScore) % 2 === 1;
  }

  jump() {
    if (this.status !== 'running') return;
    this.player.jumpReleased = false;
    if (this.grounded && !this.player.duckHeld) this.launch();
    else this.player.jumpBuffer = CONFIG.jumpBufferSeconds;
  }

  launch() {
    this.player.velocity = CONFIG.jumpVelocity;
    this.player.elevation = 0.01;
    this.player.jumpBuffer = 0;
  }

  releaseJump() {
    this.player.jumpReleased = true;
  }
  setDuck(held) {
    this.player.duckHeld = this.status === 'running' && held;
  }

  updatePlayer(dt) {
    const player = this.player;
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    if (this.grounded) return;
    if (player.jumpReleased && player.elevation >= CONFIG.minimumJumpHeight) {
      player.velocity = Math.min(player.velocity, CONFIG.releaseVelocity);
    }
    if (player.duckHeld) player.velocity = Math.min(player.velocity, 0);
    const gravity = CONFIG.gravity * (player.duckHeld ? CONFIG.fastFallMultiplier : 1);
    player.elevation += player.velocity * dt;
    player.velocity -= gravity * dt;
    if (player.elevation <= 0) {
      player.elevation = 0;
      player.velocity = 0;
      if (player.jumpBuffer > 0 && !player.duckHeld) this.launch();
    }
  }

  spawnObstacle() {
    const birdAllowed = this.score >= CONFIG.birdUnlockScore;
    const type =
      birdAllowed && this.random() < 0.27
        ? 'bird'
        : this.random() < 0.55
          ? 'smallCactus'
          : 'largeCactus';
    const sprite = SPRITES[type];
    const maxCount = this.speed < 400 ? 1 : this.speed < 500 ? 2 : 3;
    const count = type === 'bird' ? 1 : 1 + Math.floor(this.random() * maxCount);
    const birdHeights = [46, 62, 100];
    const heightAboveGround =
      type === 'bird' ? birdHeights[Math.floor(this.random() * birdHeights.length)] : sprite.height;
    const obstacle = {
      type,
      count,
      x: this.width + 35,
      y: CONFIG.groundY - heightAboveGround,
      width: sprite.width * count,
      height: sprite.height,
      cleared: false,
      animationOffset: this.random(),
    };
    this.obstacles.push(obstacle);
    // Reserve flight + landing recovery time even when speed increases or groups grow.
    const gap = this.speed * CONFIG.minimumGapSeconds + 55 + this.random() * CONFIG.extraGapPixels;
    this.spawnIn = (obstacle.width + gap) / this.speed;
  }

  playerBoxes() {
    const height = this.ducking ? SPRITES.duck.height : SPRITES.dino.height;
    const y = CONFIG.groundY - this.player.elevation - height;
    return PLAYER_BOXES[this.ducking ? 'ducking' : 'standing'].map(
      ([dx, dy, width, boxHeight]) => ({
        x: CONFIG.playerX + dx,
        y: y + dy,
        width,
        height: boxHeight,
      }),
    );
  }

  obstacleBoxes(obstacle) {
    const unitWidth = SPRITES[obstacle.type].width;
    return Array.from({ length: obstacle.count }, (_, unit) =>
      OBSTACLE_BOXES[obstacle.type].map(([dx, dy, width, height]) => ({
        x: obstacle.x + unit * unitWidth + dx,
        y: obstacle.y + dy,
        width,
        height,
      })),
    ).flat();
  }

  step(dt) {
    if (this.status !== 'running') return;
    this.elapsed += dt;
    this.speed = Math.min(
      CONFIG.maxSpeed,
      CONFIG.initialSpeed + CONFIG.acceleration * this.elapsed,
    );
    this.distance += this.speed * dt;
    this.score = Math.floor(this.distance * CONFIG.scorePerPixel);
    this.updatePlayer(dt);
    for (const obstacle of this.obstacles) {
      obstacle.x -= this.speed * dt;
      if (!obstacle.cleared && obstacle.x + obstacle.width < CONFIG.playerX) {
        obstacle.cleared = true;
        this.cleared++;
      }
    }
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -15);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) this.spawnObstacle();

    const player = this.playerBoxes();
    for (const obstacle of this.obstacles) {
      if (
        obstacle.x > CONFIG.playerX + SPRITES.duck.width ||
        obstacle.x + obstacle.width < CONFIG.playerX
      )
        continue;
      if (this.obstacleBoxes(obstacle).some((box) => player.some((part) => overlaps(box, part)))) {
        this.status = 'over';
        this.player.jumpBuffer = 0;
        break;
      }
    }
  }
}

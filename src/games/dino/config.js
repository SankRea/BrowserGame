/** Physics uses world pixels and seconds, independently of screen size and refresh rate. */
export const CONFIG = Object.freeze({
  height: 300,
  groundY: 244,
  playerX: 58,
  initialSpeed: 340,
  maxSpeed: 690,
  acceleration: 2.8,
  gravity: 2000,
  jumpVelocity: 650,
  minimumJumpHeight: 62,
  releaseVelocity: 280,
  fastFallMultiplier: 2.6,
  jumpBufferSeconds: 0.09,
  initialSpawnDelay: 1.2,
  minimumGapSeconds: 0.88,
  extraGapPixels: 110,
  birdUnlockScore: 150,
  scorePerPixel: 0.025,
  nightCycleScore: 700,
  fixedStep: 1 / 120,
  maxFrameSeconds: 0.1,
  storageKey: 'playroom.dino.best.v1',
});

// Coordinates refer to the locally hosted Chromium 1x sprite sheet (BSD license).
export const SPRITES = Object.freeze({
  dino: { x: 848, y: 2, width: 44, height: 47 },
  duck: { x: 1112, y: 24, width: 59, height: 25 },
  smallCactus: { x: 228, y: 2, width: 17, height: 35 },
  largeCactus: { x: 332, y: 2, width: 25, height: 50 },
  bird: { x: 134, y: 2, width: 46, height: 40 },
  cloud: { x: 86, y: 2, width: 46, height: 14 },
  ground: { x: 2, y: 52, width: 600, height: 12 },
  moon: { x: 484, y: 2, width: 20, height: 40 },
});

export const PLAYER_BOXES = Object.freeze({
  standing: [
    [22, 3, 17, 16],
    [9, 18, 25, 20],
    [12, 36, 8, 8],
    [25, 36, 8, 8],
  ],
  ducking: [
    [20, 5, 36, 15],
    [6, 12, 25, 10],
  ],
});

export const OBSTACLE_BOXES = Object.freeze({
  smallCactus: [
    [5, 2, 7, 32],
    [1, 10, 15, 13],
  ],
  largeCactus: [
    [9, 2, 7, 46],
    [1, 14, 23, 20],
  ],
  bird: [
    [15, 15, 16, 5],
    [18, 21, 24, 6],
    [2, 14, 4, 3],
    [6, 10, 4, 7],
    [10, 8, 6, 9],
  ],
});

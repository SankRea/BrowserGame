/** Add games here; each playable game also needs a pages/ entry in vite.config.js. */
export const GAMES = [
  {
    id: 'sudoku',
    title: '数独 Sudoku',
    description: '九宫格里，藏着刚刚好的挑战。',
    category: '单人 · 逻辑益智',
    href: 'pages/sudoku.html',
    cover: 'blue',
  },
  {
    id: 'dino',
    title: '小恐龙 Dino Run',
    description: '跳过障碍，再多跑一点点。',
    category: '单人 · 无尽跑酷',
    href: 'pages/dino.html',
    cover: 'gray',
    featured: {
      eyebrow: 'CLASSIC / DINO RUN',
      title: ['小恐龙，', '向前跑。'],
      description: ['跳过仙人掌，躲过飞鸟。', '再多跑一点，刷新自己的纪录。'],
      action: '开始玩小恐龙',
      meta: '单人跑酷 · 键盘 / 触屏',
    },
  },
  { id: 'coming-3', title: '游戏席位 03', cover: 'silver' },
  { id: 'coming-4', title: '游戏席位 04', cover: 'gray' },
  { id: 'coming-5', title: '游戏席位 05', cover: 'silver' },
  { id: 'coming-6', title: '游戏席位 06', cover: 'blue' },
];

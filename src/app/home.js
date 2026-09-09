import '../styles/base.css';
import '../styles/home.css';
import { mountSiteChrome, sitePath } from '../shared/site.js';
import { drawDinoPreview, loadDinoSprite } from '../games/dino/renderer.js';
import { GAMES } from './catalog.js';
import { createOnlyPathPreview } from '../games/only-path/preview.js';

mountSiteChrome({ home: true });

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function preview(id, featured = false) {
  if (id === 'only-path') return createOnlyPathPreview();
  if (id === 'dino') {
    const canvas = element(
      'canvas',
      featured ? 'dino-preview featured-dino-preview' : 'dino-preview',
    );
    canvas.width = 300;
    canvas.height = 128;
    canvas.dataset.preview = 'dino';
    canvas.setAttribute('aria-hidden', 'true');
    return canvas;
  }
  if (id === 'sudoku') {
    const board = element('div', 'sudoku-preview sudoku-cover-preview');
    const sample =
      '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
    for (const number of sample) board.append(element('span', '', number === '0' ? '' : number));
    return board;
  }
  const empty = element('div', 'empty-cover');
  empty.append(element('span', 'cover-plus', '+'), element('span', 'cover-caption', 'COMING SOON'));
  return empty;
}

function gameCard(game, index) {
  const card = element('article', `game-card${game.href ? ' is-playable' : ''}`);
  const container = game.href ? element('a', 'game-link') : card;
  if (game.href) {
    container.href = sitePath(game.href);
    card.append(container);
  }
  const cover = element('div', `game-cover cover-${game.cover}`);
  cover.setAttribute('aria-hidden', 'true');
  cover.append(
    element('span', 'cover-index', `NO. ${String(index + 1).padStart(3, '0')}`),
    preview(game.id),
  );
  const copy = element('div', 'game-card-copy');
  const heading = element('div', 'card-title-row');
  heading.append(
    element('h3', '', game.title),
    element(
      'span',
      `coming-tag${game.href ? ' playable-tag' : ''}`,
      game.href ? '开始游玩' : '即将登场',
    ),
  );
  const bottom = element('div', 'card-bottom');
  const arrow = element('span', '', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  bottom.append(element('span', '', game.category || 'STAY CURIOUS'), arrow);
  copy.append(heading, element('p', '', game.description || '新的快乐，还在酝酿。'), bottom);
  container.append(cover, copy);
  return card;
}

const featured = GAMES.find((game) => game.featured);
if (featured) {
  const details = featured.featured;
  document.getElementById('feature-eyebrow').textContent = `✦ ${details.eyebrow}`;
  const title = document.getElementById('feature-title');
  title.replaceChildren(
    document.createTextNode(details.title[0]),
    document.createElement('br'),
    document.createTextNode(details.title[1]),
  );
  const description = document.getElementById('feature-description');
  description.replaceChildren(
    document.createTextNode(details.description[0]),
    document.createElement('br'),
    document.createTextNode(details.description[1]),
  );
  const link = document.getElementById('feature-link');
  link.href = sitePath(featured.href);
  link.replaceChildren(document.createTextNode(details.action), element('span', '', '↗'));
  document.getElementById('feature-meta').textContent = details.meta;
  document.getElementById('feature-preview').append(preview(featured.id, true));
}

document.getElementById('game-grid').replaceChildren(...GAMES.map(gameCard));
document.getElementById('collection-count').textContent =
  `${GAMES.filter((game) => game.href).length} 款可玩 · 更多游戏准备中`;

loadDinoSprite()
  .then((image) => {
    document
      .querySelectorAll('[data-preview="dino"]')
      .forEach((canvas) => drawDinoPreview(canvas, image));
  })
  .catch(() => {
    document.querySelectorAll('[data-preview="dino"]').forEach((canvas) => {
      canvas.replaceWith(element('span', 'preview-fallback', 'DINO RUN'));
    });
  });

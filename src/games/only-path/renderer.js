const SVG_NS = 'http://www.w3.org/2000/svg';

function routeData(level, route) {
  return route
    .map(
      (cell, index) =>
        (index ? 'L' : 'M') +
        ((cell % level.width) * 100 + 50) +
        ',' +
        (Math.floor(cell / level.width) * 100 + 50),
    )
    .join(' ');
}

export class BoardView {
  constructor(root) {
    this.root = root;
    this.buttons = [];
  }

  setLevel(level) {
    this.level = level;
    this.buttons = [];
    this.root.replaceChildren();
    this.root.style.setProperty('--board-columns', level.width);
    this.root.style.aspectRatio = level.width + ' / ' + level.height;
    const grid = document.createElement('div');
    grid.className = 'only-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', level.title + '，方向键选择格子，空格放置或移除墙');
    grid.setAttribute('aria-rowcount', level.height);
    grid.setAttribute('aria-colcount', level.width);
    grid.setAttribute('aria-describedby', 'only-board-help');
    for (let row = 0; row < level.height; row++) {
      const line = document.createElement('div');
      line.className = 'only-grid-row';
      line.setAttribute('role', 'row');
      for (let col = 0; col < level.width; col++) {
        const cell = row * level.width + col;
        const wrapper = document.createElement('div');
        wrapper.className = 'only-cell';
        wrapper.setAttribute('role', 'gridcell');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'only-tile';
        button.dataset.cell = String(cell);
        button.tabIndex = -1;
        button.append(document.createElement('span'));
        wrapper.append(button);
        line.append(wrapper);
        this.buttons.push(button);
      }
      grid.append(line);
    }
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + level.width * 100 + ' ' + level.height * 100);
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('only-path-lines');
    const target = document.createElementNS(SVG_NS, 'path');
    target.classList.add('only-target-line');
    target.setAttribute('d', routeData(level, level.route));
    this.alternativeLine = document.createElementNS(SVG_NS, 'path');
    this.alternativeLine.classList.add('only-alternative-line');
    svg.append(target, this.alternativeLine);
    this.root.append(grid, svg);
    this.setCursor(level.cells.indexOf('.'));
  }

  setCursor(cell, focus = false) {
    this.cursor = Math.max(0, Math.min(cell, this.buttons.length - 1));
    this.buttons.forEach((button, index) => {
      button.tabIndex = index === this.cursor ? 0 : -1;
    });
    if (focus) this.buttons[this.cursor].focus({ preventScroll: true });
  }

  render(walls, alternate = null) {
    const level = this.level;
    const highlighted = new Set(alternate || []);
    this.buttons.forEach((button, cell) => {
      const type = level.cells[cell];
      const placed = walls.has(cell);
      const protectedCell = '*ST'.includes(type);
      button.className =
        'only-tile' +
        (type === '#' ? ' is-stone' : '') +
        (protectedCell ? ' is-target' : '') +
        (placed ? ' is-wall' : '') +
        (highlighted.has(cell) ? ' is-alternative' : '') +
        (type === 'S' || type === 'T' ? ' is-endpoint' : '');
      button.firstElementChild.textContent =
        type === 'S' ? '起' : type === 'T' ? '终' : placed ? '×' : '';
      const label =
        type === '#'
          ? '固定障碍'
          : type === 'S'
            ? '起点'
            : type === 'T'
              ? '终点'
              : protectedCell
                ? '指定路线，不可放墙'
                : placed
                  ? '已放置的墙，点击移除'
                  : '空地，点击放墙';
      button.setAttribute(
        'aria-label',
        '第 ' +
          (Math.floor(cell / level.width) + 1) +
          ' 行第 ' +
          ((cell % level.width) + 1) +
          ' 列，' +
          label +
          (highlighted.has(cell) ? '，另一条路线经过这里' : ''),
      );
      button.setAttribute('aria-disabled', String(type !== '.'));
      if (type === '.') button.setAttribute('aria-pressed', String(placed));
      else button.removeAttribute('aria-pressed');
    });
    this.alternativeLine.setAttribute('d', alternate ? routeData(level, alternate) : '');
  }
}

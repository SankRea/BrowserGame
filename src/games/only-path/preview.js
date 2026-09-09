/** A lightweight SVG cover; the lobby never imports the game controller. */
export function createOnlyPathPreview() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('only-cover-preview');
  svg.setAttribute('viewBox', '0 0 224 160');
  svg.setAttribute('aria-hidden', 'true');
  const rows = ['#######', '#S***T#', '#.#.#.#', '#..X..#', '#######'];
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x * 32 + 2);
      rect.setAttribute('y', y * 32 + 2);
      rect.setAttribute('width', 28);
      rect.setAttribute('height', 28);
      rect.setAttribute('rx', 4);
      rect.setAttribute(
        'fill',
        cell === '#' ? '#dfe5ee' : cell === 'X' ? '#3b4659' : cell === '.' ? '#fff' : '#dce7fa',
      );
      svg.append(rect);
    });
  });
  const line = document.createElementNS(ns, 'path');
  line.setAttribute('d', 'M48 48 H176');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#7b9acb');
  line.setAttribute('stroke-width', 3);
  svg.append(line);
  for (const [x, label] of [
    [48, '起'],
    [176, '终'],
  ]) {
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', 52);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#365a91');
    text.setAttribute('font-size', 12);
    text.setAttribute('font-weight', 700);
    text.textContent = label;
    svg.append(text);
  }
  return svg;
}

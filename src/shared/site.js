/** All game HTML entries live in pages/; data-root keeps links valid under GitHub Pages. */
export function sitePath(path = '') {
  return `${document.body.dataset.root || './'}${path}`;
}

export function mountSiteChrome({ home = false, footerNote = '一点空闲，一点快乐。' } = {}) {
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  if (header) {
    header.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="${sitePath('index.html')}" aria-label="Playroom 游间首页">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span>playroom<span class="brand-dot">.</span></span><span class="brand-cn">游间</span>
        </a>
        ${home ? '<nav aria-label="主导航"><a class="nav-active" href="#games">游戏大厅</a><a href="#about">关于游间</a></nav><span class="header-status"><span class="live-dot"></span> 玩一会儿，刚刚好</span>' : `<a class="back-to-lobby" href="${sitePath('index.html#games')}">← 返回游戏大厅</a>`}
      </div>`;
  }
  if (footer) {
    footer.innerHTML = `<span class="footer-brand">playroom.</span><span class="footer-note"></span><a href="${home ? '#page-title' : sitePath('index.html#games')}">${home ? '回到顶部 ↑' : '返回大厅 ↗'}</a>`;
    footer.querySelector('.footer-note').textContent = footerNote;
  }
}

/* ============================================================
   作品集前端逻辑：fetch data/works.json -> 渲染全站
   纯原生 JS，无框架依赖。部署到 Vercel/Netlify 直接生效。
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ---------- 加载数据 ---------- */
  async function loadData() {
    const res = await fetch('data/works.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('无法加载 data/works.json (' + res.status + ')');
    return res.json();
  }

  /* ---------- 导航菜单 ---------- */
  function renderNav(data) {
    const items = [
      { href: '#hero', label: '首页' },
      { href: '#about', label: '关于' },
      { href: '#works', label: '作品' },
      { href: '#resume', label: '简历' },
      { href: '#contact', label: '联系' }
    ];
    $('#navMenu').innerHTML = items.map(i =>
      `<li><a class="nav-link" href="${i.href}">${esc(i.label)}</a></li>`).join('');
    $('#navName').textContent = data.site.name || '你的名字';
    $('#navMark').textContent = data.site.logoMark || (data.site.name || '你')[0];
  }

  /* ---------- 首屏 Hero ---------- */
  function renderHero(data) {
    const s = data.site;
    $('#heroKicker').textContent = s.kicker || 'AIGC Portfolio';
    $('#heroMega').innerHTML = esc(s.title || 'AIGC\nPORTFOLIO').replace(/\n/g, '<br/>');
    $('#heroSub').textContent = s.subtitle || 'AI VISUAL CREATOR';
    $('#heroCta').textContent = s.ctaText || '查看作品';
    const video = $('#heroVideo');
    if (s.heroVideo) { video.src = s.heroVideo; }
    if (s.heroPoster) { video.poster = s.heroPoster; }

    const tasks = (s.tasks && s.tasks.length) ? s.tasks : ['创作中…'];
    const taskText = $('#taskText');
    let ti = 0;
    function rotate() {
      const item = $('#taskLayer .task-item');
      item.setAttribute('data-state', 'idle');
      setTimeout(() => {
        ti = (ti + 1) % tasks.length;
        taskText.textContent = tasks[ti];
        item.setAttribute('data-state', 'active');
      }, 450);
    }
    taskText.textContent = tasks[0];
    setInterval(rotate, 2400);
  }

  /* ---------- 关于 ---------- */
  function renderAbout(data) {
    const a = data.about || {};
    $('#aboutLead').textContent = a.lead || '';
    $('#aboutBody').textContent = a.body || '';
    const photo = $('#aboutPhoto');
    if (a.photo) { photo.src = a.photo; photo.alt = (data.site.name || '作者') + ' 头像'; }

    const grid = $('#skillsGridAbout');
    grid.innerHTML = (a.skills || []).map(g =>
      `<div class="skill-group">
        <h4>${esc(g.group)}</h4>
        <ul>${g.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
      </div>`).join('');

    $('#profileFacts').innerHTML = (a.profile || []).map(p =>
      `<div><dt>${esc(p.label)}</dt><dd>${esc(p.value)}</dd></div>`).join('');
  }

  /* ---------- 作品网格 + 分类 Tab ---------- */
  let ALL_WORKS = [];
  let CATEGORY_ORDER = [];

  function renderWorks(data) {
    ALL_WORKS = data.works || [];
    CATEGORY_ORDER = data.categories && data.categories.length
      ? data.categories
      : [...new Set(ALL_WORKS.map(w => w.category))];

    // Tab
    const cats = ['all', ...CATEGORY_ORDER.filter(c => ALL_WORKS.some(w => w.category === c))];
    $('#worksFilter').innerHTML = cats.map((c, i) =>
      `<button type="button" data-cat="${esc(c)}" class="${i === 0 ? 'active' : ''}">${c === 'all' ? '全部' : esc(c)}</button>`
    ).join('');

    $('#worksFilter').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      $$('#worksFilter button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterWorks(btn.dataset.cat);
    });

    filterWorks('all');
  }

  function filterWorks(cat) {
    const list = cat === 'all' ? ALL_WORKS : ALL_WORKS.filter(w => w.category === cat);
    const groups = CATEGORY_ORDER.filter(c => list.some(w => w.category === c));
    $('#worksGrid').innerHTML = groups.map(c => {
      const cards = list.filter(w => w.category === c).map(cardHTML).join('');
      return `<div class="gallery-group"><h3>${esc(c)}</h3><div class="gallery-grid">${cards}</div></div>`;
    }).join('') || '<p style="text-align:center;color:#999;">该分类暂无作品</p>';
    observeReveal();
  }

  function cardHTML(w) {
    const badge = w.type === 'video' ? `<span class="work-media-badge">视频</span>` : '';
    return `<article class="work-card fade-up" data-id="${esc(w.id)}" tabindex="0">
      <div class="work-media">
        <img src="${esc(w.cover)}" alt="${esc(w.title)}" loading="lazy" />
        ${badge}
        <span class="work-view">View Details</span>
      </div>
      <p>${esc(w.category)}</p>
      <h4>${esc(w.title)}</h4>
    </article>`;
  }

  /* ---------- 详情弹窗 ---------- */
  function openModal(id) {
    const w = ALL_WORKS.find(x => x.id === id);
    if (!w) return;
    const body = $('#workModalBody');

    let stage = '';
    if (w.type === 'video' && w.video) {
      stage = `<div class="ai-video-stage"><video src="${esc(w.video)}" controls autoplay muted loop playsinline></video></div>`;
    } else if (w.cover) {
      stage = `<div class="ai-video-stage"><img src="${esc(w.cover)}" alt="${esc(w.title)}" /></div>`;
    } else {
      stage = `<div class="stage-empty">暂无主视觉</div>`;
    }

    // 视频/漫剧类：工作留痕；视觉/概念类：detailImgs 铺图
    let extra = '';
    const trace = w.traceImgs || [];
    const detail = w.detailImgs || [];
    if (trace.length) {
      extra = `<p class="trace-title">工作留痕</p>
        <div class="visual-detail-grid">${trace.map(src =>
          `<button class="visual-detail-item" data-zoom="${esc(src)}"><img src="${esc(src)}" alt="过程图" loading="lazy"/></button>`).join('')}</div>`;
    } else if (detail.length) {
      extra = `<div class="visual-detail-grid">${detail.map(src =>
          `<button class="visual-detail-item" data-zoom="${esc(src)}"><img src="${esc(src)}" alt="细节图" loading="lazy"/></button>`).join('')}</div>`;
    }

    body.innerHTML = `
      <div class="wm-media">${stage}</div>
      <div class="modal-info">
        <p class="modal-category">${esc(w.category)}</p>
        <h3>${esc(w.title)}</h3>
        ${w.desc ? `<p class="modal-desc">${esc(w.desc)}</p>` : ''}
      </div>
      <div class="ai-video-detail">${extra}</div>
    `;

    $('#workModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // 图片放大（复用弹窗层）
    $$('.visual-detail-item', body).forEach(btn => {
      btn.addEventListener('click', () => showZoom(btn.dataset.zoom));
    });
  }

  function closeModal() {
    $('#workModal').classList.remove('active');
    document.body.style.overflow = '';
  }

  function showZoom(src) {
    const body = $('#workModalBody');
    body.innerHTML = `<div class="wm-media" style="aspect-ratio:auto;"><img src="${esc(src)}" alt="放大查看" style="object-fit:contain;background:#101010;min-height:60vh;"/></div>`;
  }

  /* ---------- 简历 / 联系 ---------- */
  function renderResume(data) {
    const r = data.resume || {};
    const links = [];
    if (r.pdf) links.push({ label: '获取简历 PDF', href: r.pdf });
    if (r.pptx) links.push({ label: '下载 PPT 作品集', href: r.pptx });
    $('#resumeDownloads').innerHTML = links.length
      ? links.map(l => `<a class="contact-link" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')
      : '<p style="color:#999;">简历文件待上传（在 data/works.json 的 resume 中填写 pdf/pptx 路径）</p>';
  }

  function renderContact(data) {
    const c = data.contact || {};
    $('#contactTitle').textContent = c.title || '期待与你合作';
    $('#contactText').textContent = c.text || '';
    $('#contactLinks').innerHTML = (c.links || []).map(l => {
      const href = l.href === '#wechat' ? 'javascript:void(0)' : esc(l.href);
      const attr = l.href === '#wechat' ? 'data-wechat="1"' : `target="_blank" rel="noopener"`;
      return `<a class="contact-link" href="${href}" ${attr}>${esc(l.label)}：${esc(l.text)}</a>`;
    }).join('');
    $('#contactTags').innerHTML = (c.tags || []).map(t => `<span>${esc(t)}</span>`).join('');
    $('#copyright').textContent = c.copyright || '';

    const qr = $('#wechatQr');
    if (c.wechatQr) { qr.src = c.wechatQr; qr.parentElement.style.display = ''; }
    else { qr.parentElement.style.display = 'none'; }

    // 微信弹窗触发
    $$('#contactLinks [data-wechat]').forEach(a => {
      a.addEventListener('click', () => { $('#wechat-toggle').checked = true; });
    });
  }

  /* ---------- 滚动入场 ---------- */
  let revealObserver;
  function observeReveal() {
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
    }
    $$('.fade-up:not(.in), .scale-in:not(.in)').forEach(el => revealObserver.observe(el));
  }

  /* ---------- 导航滚动态 / 移动端 ---------- */
  function bindChrome() {
    const navbar = $('#navbar');
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const toggle = $('#navToggle');
    const menu = $('#navMenu');
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.classList.remove('open'); });

    // 弹窗关闭
    $('#workModalClose').addEventListener('click', closeModal);
    $('#workModal').addEventListener('click', (e) => { if (e.target.id === 'workModal') closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); $('#wechat-toggle').checked = false; } });

    // 作品卡点击（事件委托）
    $('#worksGrid').addEventListener('click', (e) => {
      const card = e.target.closest('.work-card');
      if (card) openModal(card.dataset.id);
    });
    $('#worksGrid').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const card = e.target.closest('.work-card'); if (card) openModal(card.dataset.id); }
    });

    // mega 标题鼠标反光
    const mega = $('#heroMega');
    const hero = $('#hero');
    hero.addEventListener('mousemove', (e) => {
      const r = mega.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      mega.style.setProperty('--glare-x', x + '%');
      mega.style.setProperty('--glare-y', y + '%');
      mega.classList.add('glare-on');
      mega.classList.remove('glare-off');
    });
    hero.addEventListener('mouseleave', () => { mega.classList.add('glare-off'); mega.classList.remove('glare-on'); });
  }

  /* ---------- 启动 ---------- */
  async function init() {
    bindChrome();
    try {
      const data = await loadData();
      renderNav(data);
      renderHero(data);
      renderAbout(data);
      renderWorks(data);
      renderResume(data);
      renderContact(data);
    } catch (err) {
      console.error(err);
      $('#loaderText').textContent = '数据加载失败，请通过本地服务器预览（见说明）';
      showToast('加载 data/works.json 失败：' + err.message);
    } finally {
      setTimeout(() => $('#loader').classList.add('hidden'), 400);
      observeReveal();
    }
  }

  let toastTimer;
  function showToast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

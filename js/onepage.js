const state = { site: null, works: [], activeCategory: '' };
const main = document.querySelector('#main');
const nav = document.querySelector('.nav');
const menu = document.querySelector('.menu-button');
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
const text = (value = '') => escapeHTML(value).replace(/\n/g, '<br>');

function visibleWorks() { return state.works.filter(work => work.published).sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)); }
function embedUrl(work) {
  const url = work.video_url || '';
  if (!/^https?:\/\//i.test(url)) return '';
  if (work.video_type === 'youtube') { const match = url.match(/(?:youtu\.be\/|v=|embed\/)([^?&/]+)/); return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : url; }
  if (work.video_type === 'vimeo') { const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/); return match ? `https://player.vimeo.com/video/${match[1]}` : url; }
  return url;
}
function setMeta() {
  const name = state.site.site_name?.trim(); const tagline = state.site.site_tagline?.trim();
  const title = [name, tagline].filter(Boolean).join(' — ') || '影像作品集';
  const description = tagline || state.site.hero?.description || '影像作品集';
  document.title = title;
  document.querySelector('meta[name=description]').content = description;
  document.querySelector('meta[property="og:title"]').content = title;
  document.querySelector('meta[property="og:description"]').content = description;
  document.querySelector('.brand').textContent = name;
  document.querySelector('#footer').textContent = state.site.footer?.text || '';
}
function contactItems(contact) { return [['Email', contact.email], ['Instagram', contact.instagram], ['LINE', contact.line], ['其他', contact.other]].filter(([, value]) => value); }
function workMedia(work) {
  const video = embedUrl(work);
  if (video) return `<div class="showcase__media video"><iframe src="${escapeHTML(video)}" title="${text(work.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  if (work.cover_image) return `<img class="showcase__media" src="${escapeHTML(work.cover_image)}" alt="${text(work.title)} 封面" loading="lazy">`;
  return '<div class="showcase__media showcase__placeholder" aria-label="尚未提供作品封面">影像作品</div>';
}
function workDetails(work) {
  const details = [['拍攝日期', work.work_date], ['合作單位', work.collaboration?.organization], ['合作方式', work.collaboration?.type], ['我的工作', work.my_role?.join('、 ')], ['使用器材', work.equipment?.join('、 ')], ...Object.entries(work.production || {})].filter(([, value]) => value);
  return details.length ? `<dl class="showcase__details">${details.map(([label, value]) => `<div><dt>${text(label)}</dt><dd>${text(value)}</dd></div>`).join('')}</dl>` : '';
}
function workShowcase(work, index) {
  return `<article class="showcase reveal"><div class="showcase__media-wrap">${workMedia(work)}</div><div class="showcase__copy"><p class="eyebrow">${work.featured ? '精選作品 · ' : ''}${text(work.category || '未分類')} · ${String(index + 1).padStart(2, '0')}</p><h3>${text(work.title || '未命名作品')}</h3>${work.short_description ? `<p class="showcase__lead">${text(work.short_description)}</p>` : ''}${work.description ? `<p class="showcase__description">${text(work.description)}</p>` : ''}${workDetails(work)}</div></article>`;
}
function observeReveals(scope) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { scope.querySelectorAll('.reveal').forEach(node => node.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
  scope.querySelectorAll('.reveal:not(.is-visible)').forEach(node => observer.observe(node));
}
function renderWorks() {
  const root = document.querySelector('#works-list');
  const works = visibleWorks().filter(work => !state.activeCategory || work.category === state.activeCategory);
  root.innerHTML = works.length ? works.map(workShowcase).join('') : '<p class="empty">目前尚無可顯示的作品。</p>';
  observeReveals(root);
}
function renderPortfolio() {
  const { hero = {}, featured = {}, about = {}, services = [], process = {}, contact = {} } = state.site;
  const name = state.site.site_name?.trim();
  const categories = [...new Set(visibleWorks().map(work => work.category).filter(Boolean))];
  const steps = process.steps?.length ? process.steps : ['需求討論', '拍攝／製作', '剪輯', '修改', '成品交付'];
  const contacts = contactItems(contact);
  main.innerHTML = `<section id="top" class="hero section-anchor">${hero.image ? `<div class="hero__image" style="background-image:url('${encodeURI(hero.image)}')"></div>` : '<div class="hero__grain"></div>'}<div class="hero__content reveal is-visible">${name ? `<p class="hero__brand">${text(name)}</p>` : ''}<p class="eyebrow">${text(hero.subtitle)}</p><h1>${text(hero.title)}</h1><p class="hero__description">${text(hero.description)}</p><a class="button" href="#works">${text(hero.button_text || '觀看作品')}</a></div><a class="hero__scroll" href="#works">向下探索 <span>↓</span></a></section><section id="works" class="section section-anchor works-section"><div class="section-head reveal"><div><p class="eyebrow">Selected work</p><h2>${text(featured.title || '精選作品')}</h2></div><p>${text(featured.description)}</p></div>${categories.length ? `<div class="filters reveal"><button class="filter active" data-category="">全部作品</button>${categories.map(category => `<button class="filter" data-category="${escapeHTML(category)}">${text(category)}</button>`).join('')}</div>` : ''}<div id="works-list" class="showcases"></div></section><section id="services" class="section section-anchor services-section"><div class="section-head reveal"><div><p class="eyebrow">What I do</p><h2>服務</h2></div><p>以企劃、拍攝與後期製作，讓影像清楚傳達你的想法。</p></div><div class="services">${services.length ? services.map((item, index) => `<article class="service reveal"><span>${String(index + 1).padStart(2, '0')}</span><h3>${text(item.name)}</h3><p>${text(item.description)}</p></article>`).join('') : '<p class="empty">服務內容即將更新。</p>'}</div></section><section id="process" class="section section-anchor process-section"><div class="section-head reveal"><div><p class="eyebrow">How we work</p><h2>${text(process.title || '合作流程')}</h2></div></div><ol class="process-list">${steps.map((step, index) => `<li class="reveal"><span>${String(index + 1).padStart(2, '0')}</span><strong>${text(step)}</strong></li>`).join('')}</ol></section><section id="about" class="section section-anchor about-section"><div class="about-copy reveal"><p class="eyebrow">About</p><h2>${text(about.title || '關於')}</h2><p>${text(about.content)}</p>${about.philosophy ? `<p class="about-copy__accent">${text(about.philosophy)}</p>` : ''}${about.other ? `<p>${text(about.other)}</p>` : ''}</div></section><section id="contact" class="contact-section section-anchor"><div class="contact-section__inner reveal"><p class="eyebrow">Let’s create</p><h2>${text(contact.title || '有影片想做？')}</h2><p>${text(contact.description || '歡迎聯絡我們聊聊。')}</p><div class="contact-links">${contacts.length ? contacts.map(([label, value]) => `<a href="${label === 'Email' ? `mailto:${escapeHTML(value)}` : escapeHTML(value)}" ${label === 'Email' ? '' : 'target="_blank" rel="noopener"'}><span>${text(label)}</span><strong>${text(value)} ↗</strong></a>`).join('') : '<p>聯絡資訊即將更新。</p>'}</div>${contacts.length ? `<a class="button button--dark" href="${contact.email ? `mailto:${escapeHTML(contact.email)}` : escapeHTML(contacts[0][1])}">開始合作</a>` : ''}</div></section>`;
  renderWorks();
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { state.activeCategory = button.dataset.category; document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button)); renderWorks(); }));
  observeReveals(main);
}
function scrollToHash() { const id = location.hash.slice(1); if (!id || id.startsWith('/')) return; const target = document.getElementById(id); if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
function closeMenu() { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); }
async function init() { try { const [site, works] = await Promise.all([fetch('data/site.json').then(r => r.ok ? r.json() : Promise.reject(r.status)), fetch('data/works.json').then(r => r.ok ? r.json() : Promise.reject(r.status))]); state.site = site; state.works = works; setMeta(); renderPortfolio(); scrollToHash(); } catch (error) { main.innerHTML = '<section class="section"><h1>內容載入失敗</h1><p>請確認網站是透過靜態伺服器開啟，且 data JSON 檔案可存取。</p></section>'; console.error(error); } }
menu.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); menu.setAttribute('aria-expanded', String(open)); });
nav.addEventListener('click', closeMenu);
window.addEventListener('hashchange', scrollToHash);
init();

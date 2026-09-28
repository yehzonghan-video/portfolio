const state = { site: null, works: [] };
const main = document.querySelector('#main');
const nav = document.querySelector('.nav');
const menu = document.querySelector('.menu-button');
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
const text = (value = '') => escapeHTML(value).replace(/\n/g, '<br>');

function visibleWorks() { return state.works.filter(work => work.published).sort((a,b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)); }
function embedUrl(work) {
  const url = work.video_url || '';
  if (!url) return '';
  if (work.video_type === 'youtube') { const match = url.match(/(?:youtu\.be\/|v=|embed\/)([^?&/]+)/); return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : url; }
  if (work.video_type === 'vimeo') { const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/); return match ? `https://player.vimeo.com/video/${match[1]}` : url; }
  return url;
}
function setMeta() {
  const name = state.site.site_name?.trim(); const tagline = state.site.site_tagline?.trim();
  const title = [name, tagline].filter(Boolean).join(' — ') || '影像作品集';
  document.title = title; document.querySelector('meta[name=description]').content = tagline || state.site.hero?.description || '影像作品集';
  document.querySelector('meta[property="og:title"]').content = title; document.querySelector('meta[property="og:description"]').content = document.querySelector('meta[name=description]').content;
  document.querySelector('.brand').textContent = name; document.querySelector('#footer').textContent = state.site.footer?.text || '';
}
function card(work) {
  const template = document.querySelector('#work-card-template').content.cloneNode(true);
  const link = template.querySelector('.work-card__link'); link.href = `#/works/${encodeURIComponent(work.slug)}`; link.setAttribute('aria-label', `查看作品：${work.title}`);
  const cover = template.querySelector('.work-card__cover'); if (work.cover_image) cover.style.backgroundImage = `url("${encodeURI(work.cover_image)}")`;
  template.querySelector('.work-card__category').textContent = work.category || '未分類'; template.querySelector('.work-card__title').textContent = work.title || '未命名作品'; template.querySelector('.work-card__description').textContent = work.short_description || '';
  return template;
}
function worksGrid(works) { const grid = document.createElement('div'); grid.className = 'works-grid'; if (!works.length) grid.innerHTML = '<p class="empty">目前尚無可顯示的作品。</p>'; else works.forEach(work => grid.append(card(work))); return grid; }
function header(title, description = '') { return `<section class="page-header"><p class="eyebrow">影像作品集</p><h1>${text(title)}</h1>${description ? `<p>${text(description)}</p>` : ''}</section>`; }
function home() {
  const {hero = {}, featured = {}} = state.site; const works = visibleWorks().filter(work => work.featured);
  main.innerHTML = `<section class="hero">${hero.image ? `<div class="hero__image" style="background-image:url('${encodeURI(hero.image)}')"></div>` : ''}<div class="hero__content"><p class="eyebrow">${text(hero.subtitle)}</p><h1>${text(hero.title)}</h1><p class="hero__description">${text(hero.description)}</p><a class="button" href="#/works">${text(hero.button_text || '查看作品')}</a></div></section><section class="section"><div class="section-head"><h2>${text(featured.title || '精選作品')}</h2><p>${text(featured.description)}</p></div><div id="featured-works"></div></section>`;
  document.querySelector('#featured-works').append(worksGrid(works));
}
function works() {
  const list = visibleWorks(), categories = [...new Set(list.map(work => work.category).filter(Boolean))];
  main.innerHTML = `${header('所有作品','依照不同的合作需求與敘事方式，留下每個畫面。')}<section class="section"><div class="filters"><button class="filter active" data-category="">全部</button>${categories.map(category => `<button class="filter" data-category="${escapeHTML(category)}">${text(category)}</button>`).join('')}</div><div id="works-list"></div></section>`;
  const render = category => { const root = document.querySelector('#works-list'); root.replaceChildren(worksGrid(category ? list.filter(work => work.category === category) : list)); };
  render(''); document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.filter').forEach(item => item.classList.remove('active')); button.classList.add('active'); render(button.dataset.category); }));
}
function workDetail(slug) {
  const work = visibleWorks().find(item => item.slug === slug); if (!work) { notFound(); return; }
  const video = embedUrl(work); const cover = work.cover_image ? `<img class="detail__cover" src="${escapeHTML(work.cover_image)}" alt="${text(work.title)} 封面">` : '';
  const pairs = [['拍攝日期',work.work_date],['合作單位',work.collaboration?.organization],['合作方式',work.collaboration?.type],['我的工作',work.my_role?.join('、 ')],['使用器材',work.equipment?.join('、 ')],...Object.entries(work.production || {})].filter(([,value]) => value);
  main.innerHTML = `<article class="detail">${video ? `<div class="video"><iframe src="${escapeHTML(video)}" title="${text(work.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : cover}<div class="detail__grid"><div><p class="eyebrow">${text(work.category)}</p><h1>${text(work.title)}</h1></div><p>${text(work.short_description)}</p></div>${work.description ? `<div class="detail__content">${text(work.description)}</div>` : ''}${pairs.length ? `<dl class="metadata">${pairs.map(([label,value]) => `<div><dt>${text(label)}</dt><dd>${text(value)}</dd></div>`).join('')}</dl>` : ''}</article>`;
}
function about() { const about = state.site.about || {}; main.innerHTML = `${header(about.title || '關於我')}<section class="section"><div class="about-copy"><p>${text(about.content)}</p>${about.philosophy ? `<p>${text(about.philosophy)}</p>` : ''}${about.other ? `<p>${text(about.other)}</p>` : ''}</div></section>`; }
function services() { const services = state.site.services || []; main.innerHTML = `${header('服務')}<section class="section"><div class="services">${services.length ? services.map(item => `<article class="service"><h2>${text(item.name)}</h2><p>${text(item.description)}</p></article>`).join('') : '<p class="empty">服務內容即將更新。</p>'}</div></section>`; }
function contact() { const contact = state.site.contact || {}; const entries = [['Email',contact.email],['Instagram',contact.instagram],['LINE',contact.line],['其他',contact.other]].filter(([,value]) => value); main.innerHTML = `${header(contact.title || '聯絡',contact.description)}<section class="section contact">${entries.length ? entries.map(([label,value]) => `<p><span class="eyebrow">${text(label)}</span><br><a href="${label === 'Email' ? `mailto:${escapeHTML(value)}` : escapeHTML(value)}" target="_blank" rel="noopener">${text(value)}</a></p>`).join('') : '<p>聯絡資訊即將更新。</p>'}</section>`; }
function notFound() { main.innerHTML = `${header('找不到這個頁面')}<section class="section"><a class="button" href="#/">回到首頁</a></section>`; }
function route() { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded','false'); const part = decodeURIComponent(location.hash.replace(/^#\/?/, '') || ''); const [page,slug] = part.split('/'); document.querySelectorAll('.nav a').forEach(link => link.removeAttribute('aria-current')); const link = [...document.querySelectorAll('.nav a')].find(item => item.getAttribute('href') === `#/${page}`); if(link) link.setAttribute('aria-current','page'); if (!page) home(); else if (page === 'works' && slug) workDetail(slug); else if (page === 'works') works(); else if (page === 'about') about(); else if (page === 'services') services(); else if (page === 'contact') contact(); else notFound(); window.scrollTo(0,0); }
async function init() { try { const [site,works] = await Promise.all([fetch('data/site.json').then(r => r.ok ? r.json() : Promise.reject(r.status)),fetch('data/works.json').then(r => r.ok ? r.json() : Promise.reject(r.status))]); state.site = site; state.works = works; setMeta(); route(); } catch (error) { main.innerHTML = '<section class="section"><h1>內容載入失敗</h1><p>請確認網站是透過靜態伺服器開啟，且 data JSON 檔案可存取。</p></section>'; console.error(error); } }
menu.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); menu.setAttribute('aria-expanded', String(open)); }); window.addEventListener('hashchange', route); init();

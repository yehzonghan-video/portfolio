/* 作品 Carousel：重用 onepage.js 的 workMedia 與 YouTube URL 解析邏輯。 */
function featuredSlide(work, index) {
  const portraitClass = isYouTubeShort(work.video_url) ? ' featured-slide--portrait' : '';
  const collapsedClass = ' is-info-collapsed';
  const defaultExpanded = 'false';
  const toggleText = '展開資訊 <span>+</span>';
  const hidden = ' hidden';
  return `<article class="featured-slide${portraitClass}${collapsedClass}"><header class="featured-slide__heading"><p class="eyebrow">${text(work.category || '未分類')} · ${String(index + 1).padStart(2, '0')}</p><h3>${text(work.title || '未命名作品')}</h3></header><div class="featured-slide__media">${workMedia(work)}</div><div class="featured-slide__info"><button class="info-toggle" type="button" data-info-toggle aria-expanded="${defaultExpanded}">${toggleText}</button><div class="featured-slide__body" data-featured-info${hidden}>${work.short_description ? `<p>${text(work.short_description)}</p>` : ''}${work.description ? `<p class="work-description">${text(work.description)}</p>` : ''}${workDetails(work)}</div></div></article>`;
}

function otherWorkCard(work) {
  return `<article class="work-card reveal"><div class="work-card__body"><p class="eyebrow">${text(work.category || '未分類')}</p><h3>${text(work.title || '未命名作品')}</h3>${work.short_description ? `<p>${text(work.short_description)}</p>` : ''}${work.description ? `<p class="work-description">${text(work.description)}</p>` : ''}${workDetails(work)}${work.video_url ? `<a class="work-card__link" href="${escapeHTML(work.video_url)}" target="_blank" rel="noopener">開啟作品影片 ↗</a>` : ''}</div></article>`;
}

function renderOtherWorks(otherWorks, category) {
  const root = document.querySelector('#other-works-list');
  if (!root) return;
  const works = otherWorks.filter(work => !category || work.category === category);
  root.innerHTML = works.length ? works.map(otherWorkCard).join('') : '<p class="empty">目前沒有其他符合的作品。</p>';
  observeReveals(root);
}

function featuredCarouselGroup(works, label, showLabel) {
  if (!works.length) return '';
  return `<section class="featured-carousel-group">${showLabel ? `<h3>${label}</h3>` : ''}<div class="featured-carousel"><div class="featured-carousel__controls"><button type="button" data-carousel="previous" aria-label="上一個${label}">←</button><button type="button" data-carousel="next" aria-label="下一個${label}">→</button></div><div class="featured-carousel__track" aria-label="${label}橫向展示">${works.map(featuredSlide).join('')}</div></div></section>`;
}

function initCarousel(carousel) {
  const track = carousel.querySelector('.featured-carousel__track');
  const previous = carousel.querySelector('[data-carousel="previous"]');
  const next = carousel.querySelector('[data-carousel="next"]');
  const move = direction => track.scrollBy({ left: direction * Math.max(track.clientWidth * .84, 260), behavior: 'smooth' });
  previous?.addEventListener('click', () => move(-1));
  next?.addEventListener('click', () => move(1));
  let startX = 0; let startScroll = 0; let dragging = false;
  track.addEventListener('pointerdown', event => { dragging = true; startX = event.clientX; startScroll = track.scrollLeft; track.setPointerCapture(event.pointerId); track.classList.add('is-dragging'); });
  track.addEventListener('pointermove', event => { if (!dragging) return; track.scrollLeft = startScroll - (event.clientX - startX); });
  const stopDragging = () => { dragging = false; track.classList.remove('is-dragging'); };
  track.addEventListener('pointerup', stopDragging);
  track.addEventListener('pointercancel', stopDragging);
}

function initInfoToggles(scope) {
  scope.querySelectorAll('[data-info-toggle]').forEach(button => button.addEventListener('click', () => {
    const panel = button.parentElement.querySelector('[data-featured-info]');
    const slide = button.closest('.featured-slide');
    const expanded = button.getAttribute('aria-expanded') === 'true';
    panel.hidden = expanded;
    slide.classList.toggle('is-info-collapsed', expanded);
    button.setAttribute('aria-expanded', String(!expanded));
    button.innerHTML = `${expanded ? '展開資訊' : '收合資訊'} <span>${expanded ? '+' : '−'}</span>`;
  }));
}

function buildPortfolioCarousel() {
  if (!state.site || !document.querySelector('#works')) return false;
  const allWorks = visibleWorks();
  const featuredWorks = allWorks.filter(work => work.featured);
  const landscapeFeaturedWorks = featuredWorks.filter(work => !isYouTubeShort(work.video_url));
  const portraitFeaturedWorks = featuredWorks.filter(work => isYouTubeShort(work.video_url));
  const otherWorks = allWorks.filter(work => !work.featured);
  const categories = [...new Set(otherWorks.map(work => work.category).filter(Boolean))];
  const worksSection = document.querySelector('#works');
  const featured = state.site.featured || {};
  const hasBothOrientations = landscapeFeaturedWorks.length && portraitFeaturedWorks.length;
  worksSection.innerHTML = `<div class="section-head reveal is-visible"><div><p class="eyebrow">Selected work</p><h2>${text(featured.title || '精選作品')}</h2></div><p>${text(featured.description)}</p></div>${featuredWorks.length ? `<div class="featured-carousel-groups">${featuredCarouselGroup(landscapeFeaturedWorks, '橫式作品', hasBothOrientations)}${featuredCarouselGroup(portraitFeaturedWorks, '直式作品', hasBothOrientations)}</div>` : '<p class="empty">目前尚無精選作品。</p>'}${otherWorks.length ? `<div class="other-works"><div class="other-works__head"><p class="eyebrow">More work</p><h3>其他作品</h3></div>${categories.length ? `<div class="filters"><button class="filter active" data-other-category="">全部作品</button>${categories.map(category => `<button class="filter" data-other-category="${escapeHTML(category)}">${text(category)}</button>`).join('')}</div>` : ''}<div id="other-works-list" class="work-cards"></div></div>` : ''}`;
  worksSection.querySelectorAll('.featured-carousel').forEach(initCarousel);
  initInfoToggles(worksSection);
  renderOtherWorks(otherWorks, '');
  worksSection.querySelectorAll('[data-other-category]').forEach(button => button.addEventListener('click', () => { worksSection.querySelectorAll('[data-other-category]').forEach(item => item.classList.toggle('active', item === button)); renderOtherWorks(otherWorks, button.dataset.otherCategory); }));
  observeReveals(worksSection);
  return true;
}

function waitForPortfolio(maxAttempts = 80) {
  if (buildPortfolioCarousel() || maxAttempts <= 0) return;
  window.setTimeout(() => waitForPortfolio(maxAttempts - 1), 50);
}

waitForPortfolio();

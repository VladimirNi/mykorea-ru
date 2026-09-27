// Native ES module. No framework, transpilation, global polyfills or scroll polling.
document.documentElement.classList.add('js');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const initialized = new WeakSet();
const dataCache = new Map();
const loadedArticles = new Set([...document.querySelectorAll('[data-article-url]')].map(el => new URL(el.dataset.articleUrl, location.href).href));
let articleSequence = 0;
let userScrolled = false;
const visibleNext = new Set();

const sameOriginURL = (value, base = location.href) => {
  const url = new URL(value, base);
  if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) throw new Error('Unexpected article URL');
  return url;
};
const shuffled = values => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
async function request(url, kind) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {signal: controller.signal, credentials: 'same-origin'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    sameOriginURL(response.url);
    return kind === 'json' ? await response.json() : {html: await response.text(), url: response.url};
  } finally { clearTimeout(timer); }
}
function readRecords(source) {
  const url = sameOriginURL(source).href;
  if (!dataCache.has(url)) dataCache.set(url, request(url, 'json').catch(error => { dataCache.delete(url); throw error; }));
  return dataCache.get(url);
}
function card(record) {
  const article = document.createElement('article'); article.className = 'story-card';
  const media = document.createElement('a'); media.className = 'story-card-image';
  media.href = sameOriginURL(record.url).href; media.tabIndex = -1; media.setAttribute('aria-hidden', 'true');
  if (record.image) {
    const url = new URL(record.image, location.href);
    if (['http:', 'https:'].includes(url.protocol)) {
      const img = document.createElement('img'); img.className = 'story-image'; img.src = url.href;
      if (record.srcset) img.srcset = record.srcset;
      img.sizes = '(max-width: 600px) 44vw, 360px'; img.width = 800; img.height = 450;
      img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; media.append(img);
    }
  }
  if (!media.childElementCount) media.classList.add('story-card-placeholder');
  const body = document.createElement('div'); body.className = 'story-card-body';
  const title = document.createElement('h2'); title.className = 'story-card-title';
  const link = document.createElement('a'); link.href = sameOriginURL(record.url).href; link.textContent = record.title; link.title = record.title; title.append(link);
  const meta = document.createElement('div'); meta.className = 'story-meta';
  const date = document.createElement('time'); date.dateTime = record.datetime; date.textContent = record.date;
  const dot = document.createElement('span'); dot.textContent = '·'; dot.setAttribute('aria-hidden', 'true');
  const author = document.createElement('span'); author.className = 'story-author'; author.textContent = record.author;
  meta.append(date, dot, author); body.append(title, meta); article.append(media, body); return article;
}
async function refreshRelated(section) {
  try {
    const sources = JSON.parse(section.dataset.sources);
    const lists = await Promise.all(sources.map(readRecords));
    const current = sameOriginURL(section.dataset.current).href;
    const records = new Map();
    for (const record of lists.flat()) {
      if (!record || typeof record.url !== 'string') continue;
      const key = sameOriginURL(record.url).href;
      if (key !== current) records.set(key, record);
    }
    const selected = shuffled(records.values()).slice(0, 6);
    if (selected.length) section.querySelector('.related-list').replaceChildren(...selected.map(card));
  } catch { /* Keep the six server-rendered recommendations when offline. */ }
}
const relatedObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) { relatedObserver.unobserve(entry.target); void refreshRelated(entry.target); }
}, {rootMargin: '450px 0px'}) : null;

function prepareArticle(article, baseURL) {
  const prefix = `stream-${++articleSequence}-`;
  const idMap = new Map();
  article.querySelectorAll('script').forEach(el => el.remove());
  article.querySelectorAll('[id]').forEach(el => { idMap.set(el.id, prefix + el.id); el.id = prefix + el.id; });
  for (const el of article.querySelectorAll('[href],[src],[poster],[action]')) {
    for (const attribute of ['href', 'src', 'poster', 'action']) {
      const value = el.getAttribute(attribute); if (!value) continue;
      if (attribute === 'href' && value.startsWith('#') && idMap.has(value.slice(1))) { el.setAttribute(attribute, '#' + idMap.get(value.slice(1))); continue; }
      try { el.setAttribute(attribute, new URL(value, baseURL).href); } catch { /* Preserve invalid authored values for the browser. */ }
    }
  }
  article.querySelectorAll('[srcset]').forEach(el => {
    // Hugo-generated srcsets contain ordinary URL + width pairs; leave data URIs untouched.
    const value = el.getAttribute('srcset');
    if (!value.includes('data:')) el.setAttribute('srcset', value.split(',').map(candidate => {
      const [src, ...descriptor] = candidate.trim().split(/\s+/); return [new URL(src, baseURL).href, ...descriptor].join(' ');
    }).join(', '));
  });
  article.querySelectorAll('[aria-labelledby],[aria-describedby],[for]').forEach(el => {
    for (const attr of ['aria-labelledby','aria-describedby','for']) if (el.hasAttribute(attr)) el.setAttribute(attr, el.getAttribute(attr).split(/\s+/).map(id => idMap.get(id) ?? id).join(' '));
  });
  article.querySelectorAll('h1').forEach(el => {
    const heading = document.createElement('h2');
    for (const attr of el.attributes) heading.setAttribute(attr.name, attr.value);
    heading.append(...el.childNodes); el.replaceWith(heading);
  });
  return article;
}
async function loadNext(control) {
  if (control.dataset.busy === 'true' || control.dataset.done === 'true') return;
  const url = sameOriginURL(control.dataset.nextUrl);
  if (loadedArticles.has(url.href)) { nextObserver?.unobserve(control); control.hidden = true; return; }
  const button = control.querySelector('[data-load-next]');
  const status = control.querySelector('.load-status');
  control.dataset.busy = 'true'; control.setAttribute('aria-busy', 'true');
  button.disabled = true; status.textContent = control.dataset.loading;
  try {
    const response = await request(url.href, 'html');
    const parsed = new DOMParser().parseFromString(response.html, 'text/html');
    const source = parsed.querySelector('main > article[data-article-url]');
    if (!source || parsed.documentElement.lang !== document.documentElement.lang) throw new Error('No article in this language');
    const targetURL = sameOriginURL(source.dataset.articleUrl, response.url).href;
    if (loadedArticles.has(targetURL)) throw new Error('Article already loaded');
    const article = prepareArticle(document.importNode(source, true), response.url);
    const divider = document.createElement('div'); divider.className = 'stream-divider';
    const label = document.createElement('span'); label.textContent = control.dataset.divider;
    const open = document.createElement('a'); open.href = targetURL; open.textContent = control.dataset.open + ' ↗';
    divider.append(label, open);
    const current = control.closest('[data-article-url]');
    current.after(divider, article);
    loadedArticles.add(url.href); loadedArticles.add(targetURL);
    control.dataset.done = 'true'; visibleNext.delete(control); nextObserver?.unobserve(control);
    control.querySelectorAll('.eyebrow,.next-story-title,.next-story-actions').forEach(el => { el.hidden = true; });
    status.textContent = control.dataset.loaded;
    control.classList.add('next-story--loaded');
    initialize(article);
    // Keep focus, URL, canonical and document title on the page the reader opened.
  } catch {
    status.textContent = control.dataset.error;
    control.dataset.auto = 'false'; // Do not repeatedly retry on every observer callback.
  } finally {
    control.dataset.busy = 'false'; control.removeAttribute('aria-busy'); button.disabled = false;
  }
}
const nextObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) visibleNext.add(entry.target); else visibleNext.delete(entry.target);
    if (entry.isIntersecting && userScrolled && entry.target.dataset.auto === 'true') void loadNext(entry.target);
  }
}, {rootMargin: '0px 0px 180px 0px'}) : null;
window.addEventListener('scroll', () => {
  userScrolled = true;
  for (const control of visibleNext) if (control.dataset.auto === 'true') void loadNext(control);
}, {passive: true});
function initialize(root) {
  root.querySelectorAll('[data-related]').forEach(section => {
    if (initialized.has(section)) return; initialized.add(section);
    if (relatedObserver) relatedObserver.observe(section); else void refreshRelated(section);
  });
  root.querySelectorAll('[data-next-story]').forEach(control => {
    if (initialized.has(control)) return; initialized.add(control);
    control.querySelector('[data-load-next]').addEventListener('click', () => void loadNext(control));
    if (control.dataset.auto === 'true') nextObserver?.observe(control);
  });
  root.querySelectorAll('.post-content table').forEach(table => { table.tabIndex = 0; });
}
initialize(document);

const backButton = document.querySelector('[data-back]');
if (backButton) {
  const updateBack = () => {
    backButton.hidden = false;
    backButton.disabled = history.length <= 1;
  };
  updateBack();
  addEventListener('pageshow', updateBack);
  backButton.addEventListener('click', () => history.back());
}
const languages = document.querySelector('.language-menu');
if (languages) {
  document.addEventListener('click', event => { if (!languages.contains(event.target)) languages.open = false; });
  document.addEventListener('focusin', event => { if (!languages.contains(event.target)) languages.open = false; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && languages.open) { languages.open = false; languages.querySelector('summary')?.focus(); } });
}
document.querySelectorAll('[data-scroll-region]').forEach(region => {
  const track = region.querySelector('[data-scroll-track]'); const section = region.closest('section');
  const prev = section?.querySelector('[data-rail-prev]'); const next = section?.querySelector('[data-rail-next]');
  if (!track) return;
  const update = () => {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    section?.querySelector('[data-rail-controls]')?.classList.toggle('is-hidden', max <= 2);
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max - 2;
  };
  const move = direction => track.scrollBy({left: direction * Math.max(220, track.clientWidth * .85), behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  prev?.addEventListener('click', () => move(-1)); next?.addEventListener('click', () => move(1));
  track.addEventListener('scroll', update, {passive: true});
  if ('ResizeObserver' in window) new ResizeObserver(update).observe(track); else window.addEventListener('resize', update, {passive: true});
  update();
});

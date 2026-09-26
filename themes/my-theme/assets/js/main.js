(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-scroll-region]').forEach(region => {
    const track = region.querySelector('[data-scroll-track]');
    const section = region.closest('section');
    const prev = section?.querySelector('[data-rail-prev]');
    const next = section?.querySelector('[data-rail-next]');
    const controls = section?.querySelector('[data-rail-controls]');
    if (!track) return;
    const update = () => {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      controls?.classList.toggle('is-hidden', max <= 2);
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max - 2;
    };
    const move = direction => track.scrollBy({left: direction * Math.max(220, track.clientWidth * .85), behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    prev?.addEventListener('click', () => move(-1));
    next?.addEventListener('click', () => move(1));
    track.addEventListener('scroll', update, {passive: true});
    window.addEventListener('resize', update, {passive: true});
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    update();
  });
  const languages = document.querySelector('.language-menu');
  if (languages) {
    document.addEventListener('click', event => {
      if (!languages.contains(event.target)) languages.open = false;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && languages.open) {
        languages.open = false;
        languages.querySelector('summary')?.focus();
      }
    });
    document.addEventListener('focusin', event => {
      if (!languages.contains(event.target)) languages.open = false;
    });
  }
  // Focusable horizontal scrolling for authored tables; no dependency or body-level clipping.
  document.querySelectorAll('.post-content table').forEach(table => {
    table.tabIndex = 0;
  });
})();

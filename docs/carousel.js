/* Auto-advancing topic carousel. Pauses on hover, focus and touch; no auto-advance for reduced motion. */
(() => {
  const root = document.querySelector('.carousel');
  if (!root) return;
  const track = root.querySelector('.carousel-track');
  const slides = [...track.children];
  const dots = [...root.querySelectorAll('.carousel-dot')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let timer;

  const step = () => slides[1].offsetLeft - slides[0].offsetLeft;
  const current = () => Math.min(slides.length - 1, Math.round(track.scrollLeft / step()));
  const maxScroll = () => track.scrollWidth - track.clientWidth;
  function go(index) {
    const next = (index + slides.length) % slides.length;
    track.scrollTo({ left: Math.min(next * step(), maxScroll()), behavior: reduce.matches ? 'auto' : 'smooth' });
  }
  function mark() {
    const index = track.scrollLeft >= maxScroll() - 2 ? slides.length - 1 : current();
    dots.forEach((dot, i) => i === index ? dot.setAttribute('aria-current', 'true') : dot.removeAttribute('aria-current'));
  }
  function schedule() {
    clearInterval(timer);
    if (reduce.matches) return;
    timer = setInterval(() => { if (!paused && !document.hidden) go(track.scrollLeft >= maxScroll() - 2 ? 0 : current() + 1); }, 4500);
  }

  root.querySelector('.carousel-prev').addEventListener('click', () => go(current() - 1));
  root.querySelector('.carousel-next').addEventListener('click', () => go(current() + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
  track.addEventListener('scroll', mark, { passive: true });
  root.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(current() + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(current() - 1); }
  });
  for (const type of ['mouseenter', 'focusin', 'touchstart']) root.addEventListener(type, () => { paused = true; });
  for (const type of ['mouseleave', 'focusout', 'touchend']) root.addEventListener(type, () => { paused = false; });
  reduce.addEventListener('change', schedule);
  schedule();
})();

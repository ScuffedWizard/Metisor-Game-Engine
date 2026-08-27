// Metisor — smooth scroll (native-driven) + reveal-on-scroll
//
// Unlike a wheel-hijacking approach, this never calls window.scrollTo() in
// the render loop. The browser scrolls a normal, real spacer element
// exactly as it always would — native wheel, trackpad, touch, keyboard,
// and screen-reader behavior are all untouched. #smooth-content just reads
// the real scroll position every frame and lags a CSS transform behind it,
// which is what produces the "buttery" visual feel. Because nothing here
// ever fights the browser's own scroll pipeline, there's no risk of the
// stacked-animation lag that comes from combining scroll-behavior:smooth
// with repeated scrollTo() calls.

(function(){

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const wrapper = document.getElementById('smooth-wrapper');
const content = document.getElementById('smooth-content');
const spacer = document.querySelector('.scroll-spacer');

function lerp(a, b, t){ return a + (b - a) * t; }
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

if(wrapper && content && spacer && !prefersReducedMotion){
  let current = window.scrollY;
  const LERP_FACTOR = 0.1; // higher = tighter/snappier follow, lower = floatier lag

  function updateSpacerHeight(){
    spacer.style.height = `${content.getBoundingClientRect().height}px`;
  }
  updateSpacerHeight();

  // Debounced: recalculating spacer height mid-scroll (e.g. a canvas
  // finishing its first paint) shifts the scrollable range under the
  // user's hand, which reads as a random snap-back. Waiting for layout
  // to settle avoids fighting an in-progress scroll gesture.
  let resizeTimeout;
  const debouncedUpdate = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateSpacerHeight, 120);
  };

  const resizeObserver = new ResizeObserver(debouncedUpdate);
  resizeObserver.observe(content);
  window.addEventListener('resize', debouncedUpdate);

  function tick(){
    const target = window.scrollY;
    current = lerp(current, target, LERP_FACTOR);
    if(Math.abs(target - current) < 0.05) current = target;
    content.style.transform = `translate3d(0, ${-current}px, 0)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Anchor links still get a nice eased jump, but via one contained
  // animation loop rather than per-frame scrollTo calls fighting native scroll.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if(id.length > 1){
        const el = document.querySelector(id);
        if(el){
          e.preventDefault();
          const dest = el.getBoundingClientRect().top + window.scrollY;
          const from = window.scrollY;
          const duration = 1100;
          const t0 = performance.now();

          function animate(now){
            const t = Math.min(1, (now - t0) / duration);
            window.scrollTo(0, lerp(from, dest, easeOutCubic(t)));
            if(t < 1) requestAnimationFrame(animate);
          }
          requestAnimationFrame(animate);
        }
      }
    });
  });
} else if(content){
  // Reduced motion: skip the lag entirely, content tracks scroll 1:1
  content.style.transform = 'none';
}

// ---- Scroll reveal ----
const revealTargets = document.querySelectorAll(
  '.hero__eyebrow, .hero__headline, .hero__sub, .hero__actions, ' +
  '.core-hero__text, .tier, .backends__headline, .backends__sub, ' +
  '.pipeline__intro, .glass-card, .roadmap-note, ' +
  '.builders__intro, .builders__col, ' +
  '.get-metisor__text, .get-metisor__visual'
);

revealTargets.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add('reveal--visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

revealTargets.forEach(el => revealObserver.observe(el));

})();
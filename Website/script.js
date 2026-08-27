// Metisor — single continuous-scroll page

/* ===========================================================
   Nav: hairline on scroll + theme swap based on active section
   =========================================================== */
const nav = document.getElementById('siteNav');

function updateNavScrollState(){
  if(window.scrollY > 12){
    nav.classList.add('is-scrolled');
  } else {
    nav.classList.remove('is-scrolled');
  }
}
document.addEventListener('scroll', updateNavScrollState, { passive: true });
updateNavScrollState();

// Swap nav light/dark based on whichever themed section currently
// occupies the nav's own vertical position (near the top of viewport).
const themedSections = document.querySelectorAll('[data-theme]');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      const theme = entry.target.getAttribute('data-theme');
      nav.classList.toggle('nav--dark', theme === 'dark');
    }
  });
}, {
  // Trigger when a section crosses the nav's band near the top of the screen
  rootMargin: '-40% 0px -55% 0px',
  threshold: 0,
});

themedSections.forEach(section => navObserver.observe(section));

/* ===========================================================
   Mobile nav toggle
   =========================================================== */
const navToggle = document.querySelector('.nav__toggle');
if(navToggle){
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
  });
}

/* ===========================================================
   The Core — load grid
   =========================================================== */
const gridEl = document.getElementById('loadGrid');

if(gridEl){
  const COLS = 48;
  const ROWS = 14;
  const TOTAL = COLS * ROWS;

  const HOTSPOT_VALUE = 60;
  const SCALE_STRENGTH = 2.6;
  const UPDATE_INTERVAL = 1400;

  const dots = [];
  const frag = document.createDocumentFragment();

  for(let i = 0; i < TOTAL; i++){
    const el = document.createElement('div');
    el.className = 'load-dot';
    frag.appendChild(el);
    dots.push({
      el,
      col: i % COLS,
      row: Math.floor(i / COLS),
    });
  }
  gridEl.appendChild(frag);

  // Two ambient hotspots drifting slowly — represent background workload
  let spots = [
    { col: Math.floor(COLS * 0.25), row: Math.floor(ROWS * 0.5) },
    { col: Math.floor(COLS * 0.75), row: Math.floor(ROWS * 0.5) },
  ];

  // Cursor acts as a live third hotspot when present
  let cursorSpot = null;

  gridEl.addEventListener('mousemove', (e) => {
    const rect = gridEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    cursorSpot = {
      col: Math.round(px * (COLS - 1)),
      row: Math.round(py * (ROWS - 1)),
    };
  });

  gridEl.addEventListener('mouseleave', () => {
    cursorSpot = null;
  });

  // Only animate the grid while its section is actually visible
  let gridActive = true;
  const gridObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      gridActive = entry.isIntersecting;
    });
  }, { threshold: 0.05 });
  gridObserver.observe(gridEl.closest('.core-hero'));

  function step(){
    if(!gridActive) return;

    spots.forEach(spot => {
      // occasionally hold still instead of always moving — reads as drifting, not jittering
      if(Math.random() < 0.65){
        spot.col += Math.floor(Math.random() * 3) - 1;
        spot.row += Math.floor(Math.random() * 3) - 1;
      }
      spot.col = Math.max(0, Math.min(COLS - 1, spot.col));
      spot.row = Math.max(0, Math.min(ROWS - 1, spot.row));
    });

    const activeSpots = cursorSpot ? [...spots, { ...cursorSpot, boost: true }] : spots;

    dots.forEach(dot => {
      let value = 0;

      activeSpots.forEach(spot => {
        const distance = Math.max(Math.abs(dot.col - spot.col), Math.abs(dot.row - spot.row));
        const strength = spot.boost ? HOTSPOT_VALUE * 1.3 : HOTSPOT_VALUE;
        const dropOff = strength * 0.22;
        value += Math.max(0, strength - distance * dropOff);
      });

      value = Math.min(HOTSPOT_VALUE * 1.3, value);

      const scale = 1 + (value / HOTSPOT_VALUE) * SCALE_STRENGTH;
      dot.el.style.transform = `scale(${scale})`;

      // Cool blue-violet ramp instead of plain white/grey
      const t = Math.min(1, value / HOTSPOT_VALUE);
      const r = Math.round(58 + t * (140 - 58));
      const g = Math.round(58 + t * (110 - 58));
      const b = Math.round(66 + t * (255 - 66));
      dot.el.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    });
  }

  step();
  setInterval(step, UPDATE_INTERVAL);
}
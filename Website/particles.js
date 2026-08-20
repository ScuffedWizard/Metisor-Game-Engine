// Metisor — Who's Building particle cloud
// Adapted from the reference neon-cursor particle effect: same lag/follow
// physics, recolored to the brand's blue→violet range instead of a full
// hue sweep, scoped to one section, and paused when off-screen.

(function(){

const canvas = document.getElementById('buildersCanvas');
if(!canvas) return;

const ctx = canvas.getContext('2d');
const section = canvas.closest('.builders');

let w, h, dpr;

function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = section.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener('resize', resize);

let mouse = { x: w / 2, y: h / 2 };
let hasPointer = false;

section.addEventListener('mousemove', (e) => {
    const rect = section.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    hasPointer = true;
});

section.addEventListener('mouseleave', () => {
    hasPointer = false;
});

const AMOUNT = 420; // lighter than the 1000 in the reference — this runs alongside a lot of other motion
const particles = [];

for(let i = 0; i < AMOUNT; i++){
    const angle = Math.random() * Math.PI * 2;
    particles.push({
        angle,
        radius: 90 + Math.random() * 240,
        speed: 0.001 + Math.random() * 0.004,
        size: (0.8 + Math.random() * 1.1) * 1.1,
        x: w / 2,
        y: h / 2,
        wobble: Math.random() * 40,
    });
}

let center = { x: w / 2, y: h / 2 };
let velocity = { x: 0, y: 0 };
let lastMouse = { x: mouse.x, y: mouse.y };

function lerp(a, b, t){ return a + (b - a) * t; }

let active = true;
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { active = entry.isIntersecting; });
}, { threshold: 0.05 });
observer.observe(section);

function draw(t){
    requestAnimationFrame(draw);
    if(!active) return;

    ctx.clearRect(0, 0, w, h);

    // Ambient drift target when there's no pointer in the section
    const driftX = w / 2 + Math.sin(t * 0.00025) * w * 0.18;
    const driftY = h / 2 + Math.cos(t * 0.0003) * h * 0.18;
    const targetX = hasPointer ? mouse.x : driftX;
    const targetY = hasPointer ? mouse.y : driftY;

    const mx = targetX - lastMouse.x;
    const my = targetY - lastMouse.y;
    lastMouse.x = targetX;
    lastMouse.y = targetY;

    velocity.x = lerp(velocity.x, mx, 0.25);
    velocity.y = lerp(velocity.y, my, 0.25);
    velocity.x *= 0.92;
    velocity.y *= 0.92;

    center.x = lerp(center.x, targetX, 0.045) + velocity.x * 1.2;
    center.y = lerp(center.y, targetY, 0.045) + velocity.y * 1.2;

    for(const p of particles){
        p.angle += p.speed;
        const radius = p.radius + Math.sin(t * 0.001 + p.wobble) * 20;
        const lag = p.radius / 340;

        const tx = center.x - velocity.x * lag + Math.cos(p.angle) * radius;
        const ty = center.y - velocity.y * lag + Math.sin(p.angle) * radius;

        const follow = 0.008 + (1 - p.radius / 360) * 0.045;
        p.x = lerp(p.x, tx, follow);
        p.y = lerp(p.y, ty, follow);

        const dx = center.x - p.x;
        const dy = center.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const stretch = Math.max(0, 110 - dist) / 110;
        const length = 3 + stretch * 7;
        const direction = Math.atan2(dy, dx);

        // Hue confined to the brand's blue→violet range (220–290) instead
        // of a full rainbow sweep, so it reads as "Metisor" not "generic demo"
        const hue = 220 + ((p.x / w) * 70 + t * 0.01) % 70;
        const color = `hsl(${hue}, 85%, 62%)`;

        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5 + stretch * 0.3;
        ctx.lineWidth = p.size * 0.55 + stretch * 0.2;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(direction) * length, p.y - Math.sin(direction) * length);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
}

requestAnimationFrame(draw);

})();
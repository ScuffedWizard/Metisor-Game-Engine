// Metisor — Liquid glass card renderer
// Adapted from the reference glass shader: each card gets its own WebGL
// context, renders a self-contained colored background, then refracts /
// blurs / chromatic-aberrates it through a full-card rounded rect. All
// cards share one requestAnimationFrame loop and pause when off-screen.

(function(){

const quadVert = `
attribute vec2 p;
varying vec2 uv;
void main(){
    uv = p * .5 + .5;
    gl_Position = vec4(p, 0, 1);
}
`;

const bgFrag = `
precision highp float;
varying vec2 uv;
uniform float hue;
uniform float time;

vec3 hsl2rgb(vec3 c){
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0*c.z-1.0));
}

void main(){
    vec2 p = uv;
    float h1 = hue/360.0;
    float h2 = mod(hue+40.0, 360.0)/360.0;

    vec3 a = hsl2rgb(vec3(h1, 0.65, 0.55));
    vec3 b = hsl2rgb(vec3(h2, 0.72, 0.66));

    float mixT = 0.5 + 0.5*sin(p.x*3.0 + p.y*2.2 + time*0.15);
    vec3 c = mix(a, b, mixT);

    // High-contrast diagonal stripes so the glass' refraction is
    // unmistakable rather than blending into a soft gradient.
    float stripe = sin((p.x + p.y) * 26.0 - time * 0.9);
    float stripeMask = smoothstep(0.75, 0.95, stripe);
    c = mix(c, c * 1.6 + 0.12, stripeMask);

    // Slow-moving bright blob drifting across the panel
    vec2 blobPos = vec2(0.5 + 0.32*cos(time*0.22), 0.5 + 0.32*sin(time*0.17));
    float glow = smoothstep(0.55, 0.0, length(p - blobPos));
    c += glow * 0.3;

    gl_FragColor = vec4(c, 1.0);
}
`;

const glassFrag = `
precision highp float;
uniform sampler2D tex;
uniform vec2 res;
uniform float radiusPx;
varying vec2 uv;

float roundedBox(vec2 p, vec2 b, float r){
    vec2 q = abs(p) - b + vec2(r);
    return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - r;
}

float bevel(float d, float z){
    if(d <= 0.0) return 0.0;
    if(d >= z) return z;
    return sqrt(d * (2.0*z - d));
}

void main(){
    vec2 center = vec2(.5);
    vec2 size = (res * 0.5) - vec2(2.0);
    vec2 local = (uv - center) * res;

    float sdf = roundedBox(local, size, radiusPx);
    float mask = 1.0 - smoothstep(0.0, 2.0, sdf);
    float inside = -sdf;

    float e = 2.0;
    float z = 26.0;

    float hC = bevel(inside, z);
    float hR = bevel(-roundedBox(local+vec2(e,0.0), size, radiusPx), z);
    float hL = bevel(-roundedBox(local-vec2(e,0.0), size, radiusPx), z);
    float hU = bevel(-roundedBox(local+vec2(0,e), size, radiusPx), z);
    float hD = bevel(-roundedBox(local-vec2(0,e), size, radiusPx), z);

    vec2 grad = vec2(hR-hL, hU-hD) / (2.0*e);
    vec3 N = normalize(vec3(-grad, 1.0));

    float depth = smoothstep(0.0, z, inside);
    vec2 offset = N.xy * .022 * depth;

    float ca = .006;
    vec3 col;
    col.r = texture2D(tex, uv+offset+N.xy*ca).r;
    col.g = texture2D(tex, uv+offset).g;
    col.b = texture2D(tex, uv+offset-N.xy*ca).b;

    vec3 blur = vec3(0);
    for(int x=-2; x<=2; x++){
        for(int y=-2; y<=2; y++){
            blur += texture2D(tex, uv + vec2(float(x),float(y))/res*3.2).rgb;
        }
    }
    blur /= 25.0;
    col = mix(col, blur, .5);

    float fres = pow(1.0 - N.z, 4.0);
    col += vec3(fres) * .45;

    vec3 L = normalize(vec3(.5,.8,1));
    vec3 H = normalize(vec3(0,0,1) + L);
    float spec = pow(max(dot(N,H), 0.0), 70.0);
    col += spec * 0.8;

    col *= vec3(.94, .97, 1.04);

    gl_FragColor = vec4(col, mask);
}
`;

function compileShader(gl, type, src){
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
}

function buildProgram(gl, vSrc, fSrc){
    const p = gl.createProgram();
    gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vSrc));
    gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fSrc));
    gl.linkProgram(p);
    return p;
}

class GlassCard{
    constructor(canvas){
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', { premultipliedAlpha: false });
        this.active = true;
        if(!this.gl) return;

        const gl = this.gl;
        this.bgProgram = buildProgram(gl, quadVert, bgFrag);
        this.glassProgram = buildProgram(gl, quadVert, glassFrag);

        this.buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

        this.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.fbo = gl.createFramebuffer();

        this.hue = parseFloat(canvas.dataset.hue || '250');
        this.resize();
    }

    resize(){
        const rect = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if(w < 2 || h < 2) return; // layout not ready yet — skip, next resize will catch it
        this.canvas.width = w;
        this.canvas.height = h;
    }

    draw(t){
        if(!this.gl || !this.active) return;
        const gl = this.gl;
        const w = this.canvas.width;
        const h = this.canvas.height;
        if(w < 2 || h < 2) return;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);

        gl.viewport(0, 0, w, h);
        gl.useProgram(this.bgProgram);
        let loc = gl.getAttribLocation(this.bgProgram, 'p');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(gl.getUniformLocation(this.bgProgram, 'hue'), this.hue);
        gl.uniform1f(gl.getUniformLocation(this.bgProgram, 'time'), t * .001);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, w, h);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(this.glassProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.uniform1i(gl.getUniformLocation(this.glassProgram, 'tex'), 0);
        gl.uniform2f(gl.getUniformLocation(this.glassProgram, 'res'), w, h);
        gl.uniform1f(gl.getUniformLocation(this.glassProgram, 'radiusPx'), Math.min(w, h) * 0.12);

        loc = gl.getAttribLocation(this.glassProgram, 'p');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.disable(gl.BLEND);
    }
}

function initGlassCards(){
    const canvases = document.querySelectorAll('.glass-card__canvas');
    if(!canvases.length) return;

    const instances = Array.from(canvases).map(c => new GlassCard(c));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const inst = instances.find(i => i.canvas === entry.target);
            if(inst) inst.active = entry.isIntersecting;
        });
    }, { threshold: 0.05 });
    canvases.forEach(c => observer.observe(c));

    // Re-measure on any real layout change, not just window resize —
    // covers late font loads, devtools toggling, etc.
    const resizeObserver = new ResizeObserver((entries) => {
        entries.forEach(entry => {
            const inst = instances.find(i => i.canvas === entry.target);
            if(inst) inst.resize();
        });
    });
    canvases.forEach(c => resizeObserver.observe(c));

    function loop(t){
        instances.forEach(i => i.draw(t));
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initGlassCards);
} else {
    initGlassCards();
}

})();
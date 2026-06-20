// main.js — the switcher, the pipeline, the demo. the switcher is the demo.
//
// Pipeline (per frame):
//   1. depth.frag  (+ chosen depth/<engine>.glsl)  ->  depthFBO   z(x,y)
//   2. stereogram.frag (depthFBO + pattern tex)     ->  sceneFBO   the magic
//   3. post-process.frag (sceneFBO)                 ->  screen     CRT chunk
//
// Export: read depthFBO back to the CPU and run the true SIRDS (sirds-cpu.js).

import { makePattern, isLiving } from './pattern-sources.js';
import { renderSIRDS, downloadImageData } from './sirds-cpu.js';

const SHADERS = './src/shaders/';
const ENGINES = SHADERS + 'depth/';

// Internal render resolution. Stereograms want horizontal precision more than
// the typical 320x200 demoscene chunk, so we run a bit wider but still upscale
// nearest-neighbor to the canvas for that crunchy edge. the chunky is the right.
const RW = 640;
const RH = 400;

const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: false });
if (!gl) {
  document.body.innerHTML = '<p style="color:#ff006e;font-family:monospace;padding:2em">WebGL2 not available — the magic needs a modern browser.</p>';
  throw new Error('no webgl2');
}

// ---- tiny GL helpers ----
function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('shader compile:\n' + gl.getShaderInfoLog(s) + '\n---\n' + numbered(src));
  }
  return s;
}
function numbered(src) {
  return src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
}
function program(vsSrc, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('link: ' + gl.getProgramInfoLog(p));
  }
  return p;
}

// Fullscreen triangle — no VBO needed, gl_VertexID trick. the triangle is the screen.
const VERT = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

async function loadText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('fetch ' + url + ' -> ' + r.status);
  return r.text();
}

// Render target: a texture + framebuffer. the FBO is the flame.
function makeFBO(w, h, filter = gl.NEAREST) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, w, h };
}

// ---- state ----
const state = {
  engine: 'sdf-shape',
  pattern: 'random_dots',
  E: 128,
  mu: 0.4,
  animate: false,
  scanlines: true,
  showDepth: false,
};

let depthProgram = null;          // rebuilt when engine changes
let stereoProgram, postProgram;
let depthFBO, sceneFBO;
let patternTex;
let depthFragTemplate;            // depth.frag with __DEPTH_ENGINE__ marker
const engineCache = {};

function makePatternTexture() {
  if (!patternTex) {
    patternTex = gl.createTexture();
  }
  const size = Math.round(state.E);
  const seed = isLiving(state.pattern) ? (Math.random() * 1e9) | 0 : 1337;
  const img = makePattern(state.pattern, size, seed);
  gl.bindTexture(gl.TEXTURE_2D, patternTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

async function buildDepthProgram() {
  if (!engineCache[state.engine]) {
    engineCache[state.engine] = await loadText(ENGINES + state.engine + '.glsl');
  }
  const src = depthFragTemplate.replace('//__DEPTH_ENGINE__', engineCache[state.engine]);
  if (depthProgram) gl.deleteProgram(depthProgram);
  depthProgram = program(VERT, src);
}

function u(p, name) { return gl.getUniformLocation(p, name); }

function drawFullscreen() { gl.drawArrays(gl.TRIANGLES, 0, 3); }

let startTime = performance.now();

function frame() {
  const t = (performance.now() - startTime) / 1000;

  // living patterns get a fresh tile each frame. the living is the time.
  if (state.animate && isLiving(state.pattern)) makePatternTexture();

  // --- pass 1: depth ---
  gl.useProgram(depthProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFBO.fbo);
  gl.viewport(0, 0, RW, RH);
  gl.uniform1f(u(depthProgram, 'uTime'), t);
  gl.uniform1f(u(depthProgram, 'uAnimate'), state.animate ? 1 : 0);
  gl.uniform1f(u(depthProgram, 'uAspect'), RW / RH);
  drawFullscreen();

  // --- pass 2: stereogram ---
  gl.useProgram(stereoProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFBO.fbo);
  gl.viewport(0, 0, RW, RH);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, depthFBO.tex);
  gl.uniform1i(u(stereoProgram, 'uDepth'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, patternTex);
  gl.uniform1i(u(stereoProgram, 'uPattern'), 1);
  gl.uniform2f(u(stereoProgram, 'uResolution'), RW, RH);
  gl.uniform1f(u(stereoProgram, 'uPeriod'), state.E);
  gl.uniform1f(u(stereoProgram, 'uMu'), state.mu);
  gl.uniform1f(u(stereoProgram, 'uShowDepth'), state.showDepth ? 1 : 0);
  drawFullscreen();

  // --- pass 3: post -> screen ---
  gl.useProgram(postProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sceneFBO.tex);
  gl.uniform1i(u(postProgram, 'uScene'), 0);
  gl.uniform2f(u(postProgram, 'uResolution'), canvas.width, canvas.height);
  gl.uniform1f(u(postProgram, 'uScanlines'), state.scanlines ? 1 : 0);
  drawFullscreen();

  requestAnimationFrame(frame);
}

// ---- export: true SIRDS via CPU ----
function exportTrueSIRDS() {
  // read the current GPU depth map back. the readback is the secret.
  const buf = new Uint8Array(RW * RH * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFBO.fbo);
  gl.readPixels(0, 0, RW, RH, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // GL is bottom-up; flip to top-down and pull z from .r into a float field.
  const depth = new Float32Array(RW * RH);
  for (let y = 0; y < RH; y++) {
    const sy = RH - 1 - y;
    for (let x = 0; x < RW; x++) {
      depth[y * RW + x] = buf[(sy * RW + x) * 4] / 255;
    }
  }

  const pattern = state.pattern === 'random_dots'
    ? null
    : makePattern(state.pattern, Math.round(state.E), 4242);

  const img = renderSIRDS(depth, RW, RH, { E: state.E, mu: state.mu, pattern });
  downloadImageData(img, `autostereogram_${state.engine}_${state.pattern}.png`);
}

// ---- UI wiring ----
function bind() {
  const $ = (id) => document.getElementById(id);

  $('engine').value = state.engine;
  $('pattern').value = state.pattern;

  $('engine').addEventListener('change', async (e) => {
    state.engine = e.target.value;
    await buildDepthProgram();
  });
  $('pattern').addEventListener('change', (e) => {
    state.pattern = e.target.value;
    // tiled image looks best paired with the breathing animate toggle off by default
    makePatternTexture();
  });
  $('E').addEventListener('input', (e) => {
    state.E = +e.target.value;
    $('eVal').textContent = state.E;
    makePatternTexture(); // tile size follows E for a clean 1:1 wrap
  });
  $('mu').addEventListener('input', (e) => {
    state.mu = +e.target.value;
    $('muVal').textContent = state.mu.toFixed(2);
  });
  $('animate').addEventListener('change', (e) => { state.animate = e.target.checked; });
  $('scanlines').addEventListener('change', (e) => { state.scanlines = e.target.checked; });
  $('showDepth').addEventListener('change', (e) => { state.showDepth = e.target.checked; });
  $('export').addEventListener('click', exportTrueSIRDS);

  const toggle = $('toggle');
  const ui = $('ui');
  toggle.addEventListener('click', () => {
    ui.classList.toggle('hidden');
    toggle.textContent = ui.classList.contains('hidden') ? '[ show ]' : '[ hide ]';
  });
}

function resize() {
  // upscale RWxRH to fit the viewport, integer-ish, nearest. the chunky is the right.
  const scale = Math.max(1, Math.min(
    Math.floor(window.innerWidth / RW),
    Math.floor(window.innerHeight / RH)
  )) || 1;
  canvas.width = RW;
  canvas.height = RH;
  canvas.style.width = (RW * scale) + 'px';
  canvas.style.height = (RH * scale) + 'px';
}

async function init() {
  const [depthTpl, stereoSrc, postSrc] = await Promise.all([
    loadText(SHADERS + 'depth.frag'),
    loadText(SHADERS + 'stereogram.frag'),
    loadText(SHADERS + 'post-process.frag'),
  ]);
  depthFragTemplate = depthTpl;
  stereoProgram = program(VERT, stereoSrc);
  postProgram = program(VERT, postSrc);

  depthFBO = makeFBO(RW, RH, gl.NEAREST);
  sceneFBO = makeFBO(RW, RH, gl.NEAREST);

  await buildDepthProgram();
  makePatternTexture();

  bind();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
}

init().catch((err) => {
  console.error(err);
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;bottom:0;left:0;right:0;color:#ff006e;background:#000;padding:1em;margin:0;font-size:11px;white-space:pre-wrap;z-index:99';
  pre.textContent = err.message;
  document.body.appendChild(pre);
});

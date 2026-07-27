"use client";

import { useEffect, useRef } from "react";

/**
 * WebGL lava lamp for the CTA — a cluster of maroon/saffron metaball blobs
 * roaming behind the type, blurred soft and grained. A slight scroll parallax
 * lifts the whole field (and, via --cta-parallax, the text) as the Locations
 * card rises.
 *
 * (The cursor-following blob lives here too when enabled; it's removed for now
 * — see git history / the `u_mouse`-era version to restore it.)
 *
 * Decorative (aria-hidden, pointer-events: none via CSS). Honours reduced
 * motion with a single still frame. CSS fallback gradient if WebGL is absent.
 */
const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_parallax;
uniform vec4 u_btn; // cx, cy, hx, hy (p-space) of the Join Us button

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * asp, uv.y - 0.5);
  float t = u_time * 0.09;

  vec2 warp = vec2(fbm(p * 1.7 + t * 0.8), fbm(p * 1.7 - t * 0.8 + 5.0));
  vec2 pw = p + warp * 0.22;

  // background lava blobs — a slight parallax lifts them as the card rises
  float py = u_parallax;
  vec2 cen[5];
  cen[0] = vec2(0.24 * sin(t * 0.41),        0.00 + py + 0.15 * sin(t * 0.33));
  cen[1] = vec2(0.30 * sin(t * 0.29 + 2.0),  0.03 + py + 0.17 * sin(t * 0.44 + 2.1));
  cen[2] = vec2(0.20 * sin(t * 0.52 + 4.0), -0.02 + py + 0.14 * sin(t * 0.37 + 4.2));
  cen[3] = vec2(0.27 * sin(t * 0.36 + 5.5),  0.02 + py + 0.17 * sin(t * 0.48 + 1.3));
  cen[4] = vec2(0.28 * sin(t * 0.47 + 3.2),  0.05 + py + 0.16 * sin(t * 0.40 + 5.0));

  vec3 pal[5];
  pal[0] = vec3(0.26, 0.02, 0.03); // maroon
  pal[1] = vec3(0.46, 0.14, 0.07); // burgundy/rust
  pal[2] = vec3(0.60, 0.30, 0.10); // russet
  pal[3] = vec3(0.70, 0.44, 0.15); // saffron-forward
  pal[4] = vec3(0.54, 0.22, 0.09); // deep rust

  float s2[5];
  s2[0] = 2.0 * 0.100 * 0.100;
  s2[1] = 2.0 * 0.085 * 0.085;
  s2[2] = 2.0 * 0.115 * 0.115;
  s2[3] = 2.0 * 0.075 * 0.075;
  s2[4] = 2.0 * 0.095 * 0.095;

  float field = 0.0;
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 d = pw - cen[i];
    float w = exp(-dot(d, d) / s2[i]);
    field += w;
    acc += pal[i] * w;
    wsum += w;
  }
  // a permanent, gently-breathing warm pool anchored behind the Join Us button
  // so its difference-blend label always sits on colour and stays legible, even
  // where the lava has drifted off (added to the same field, so it reads as a
  // natural part of the goo, not a box)
  float btnPool = 0.0;
  if (u_btn.z > 0.0) {
    vec2 bd = (pw - u_btn.xy) / vec2(u_btn.z * 2.6, u_btn.w * 3.4);
    btnPool =
      smoothstep(1.0, 0.15, length(bd)) * (0.88 + 0.12 * sin(t * 0.8)) * 1.25;
    field += btnPool;
    acc += vec3(0.34, 0.12, 0.06) * btnPool;
    wsum += btnPool;
  }

  vec3 gooCol = acc / max(wsum, 0.0001);

  float mass = smoothstep(0.5, 0.92, field);
  // keep the lava central — fade before the top/bottom edges, but never fade
  // the button pool (it must stay solid behind the label)
  mass = max(mass * smoothstep(0.5, 0.28, abs(p.y)), smoothstep(0.5, 0.92, btnPool));

  vec3 cream = vec3(0.980, 0.969, 0.945); // --cream #faf7f1 — must match the page ground exactly (any drift shows as an edge line)
  vec3 col = mix(cream, gooCol, mass);

  // glossy shine on the lava blobs
  float shine = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 d = pw - (cen[i] + vec2(-0.05, 0.06));
    shine += exp(-dot(d, d) * 60.0);
  }
  col += mass * shine * 0.16;

  // soft film grain (the page grain adds most of the texture)
  float g = fract(
    sin(dot(gl_FragCoord.xy + floor(t * 24.0), vec2(12.9898, 78.233))) *
      43758.5453
  );
  col += (g - 0.5) * 0.03;

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function MeshGradient({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) return; // CSS fallback gradient shows through

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("MeshGradient shader error:", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("MeshGradient link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uParallax = gl.getUniformLocation(prog, "u_parallax");
    const uBtn = gl.getUniformLocation(prog, "u_btn");

    const section = canvas.closest("section");
    const button = section?.querySelector<HTMLElement>("[data-cta-blob-target]");

    // feed the button's rect (p-space) so the shader can hold a warm pool behind
    // it — keeping the difference-blend label legible over any background
    const updateButtonPool = () => {
      if (!button) {
        gl.uniform4f(uBtn, 0, 0, 0, 0);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const asp = canvas.width / Math.max(1, canvas.height);
      const b = button.getBoundingClientRect();
      const cx =
        ((b.left + b.width / 2 - rect.left) / Math.max(1, rect.width) - 0.5) *
        asp;
      const cy =
        1 - (b.top + b.height / 2 - rect.top) / Math.max(1, rect.height) - 0.5;
      const hx = (b.width / 2 / Math.max(1, rect.width)) * asp;
      const hy = b.height / 2 / Math.max(1, rect.height);
      gl.uniform4f(uBtn, cx, cy, hx, hy);
    };

    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.7;
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // slight scroll parallax across the section's WHOLE trip: an ENTRY drift as
    // it rises in from the Blog (content starts a little low and settles), then
    // an EXIT lift as the Locations film rises over it. Both the lava (uniform)
    // and — a touch less — the text (--cta-parallax → .inner's `top`; a
    // transform there would isolate the heading's blend) move together.
    const updateParallax = () => {
      if (!section) {
        gl.uniform1f(uParallax, 0);
        return;
      }
      const sr = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 1 as the section top enters at the viewport bottom → 0 once it's pinned
      const entry = Math.min(1, Math.max(0, sr.top / vh));
      // 0 pinned → 1 once scrolled a full viewport further (film covering)
      const exit = Math.min(1, Math.max(0, -sr.top / Math.max(1, sr.height - vh)));
      // lava + text drift by ~the same amount so they move together (the blob
      // p-space units ≈ text px / canvas height): text 40px/64px ≈ 0.043/0.069
      gl.uniform1f(uParallax, exit * 0.066 - entry * 0.042);
      // text: starts a touch low on entry, lifts up on exit
      (section as HTMLElement).style.setProperty(
        "--cta-parallax",
        `${(entry * 40 - exit * 64).toFixed(1)}px`
      );
    };

    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      resize();
      gl.uniform1f(uTime, (now - start) / 1000);
      updateParallax();
      updateButtonPool();
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    };

    gl.uniform1f(uTime, reduce ? 8.0 : 0.0);
    updateParallax();
    updateButtonPool();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}

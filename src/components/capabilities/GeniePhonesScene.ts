import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { capabilitiesConfig as cfg, type GeniePhone } from "./capabilities.config";

/**
 * POPgenie 3D phones, ported from the prototype (index.html). Body = the mockup
 * photo projected onto a smooth pebble mesh: at rest it looks like the mockup;
 * tilting adds lighting change, a glint and walls in the phone's colour. Each
 * phone has its own canvas (so CSS can move / fade / stack them) and springs
 * toward the mouse ("gravity"). A side phone's scroll tilt comes from the
 * --ry CSS variable on its [data-move] element (tweened by the section timeline).
 */

/** Model image size + centre x, and canvas margin around the phone (room to tilt). */
export const MODEL_W = 577;
export const MODEL_H = 1042;
export const MODEL_CX = 289;
export const MARGIN_X = 0.22;
export const MARGIN_Y = 0.14;

type PhoneGeo = {
  inner: [number, number][];
  size: [number, number];
  cx: number;
  bevel: number;
};

type Phone = {
  def: GeniePhone;
  el: HTMLElement; // positioned box
  move: HTMLElement; // scroll-animated (x, scale, opacity, --ry)
  tilt: HTMLElement;
  shadow: HTMLElement;
  strength: number;
  phase: number;
  ry0: number;
  spring: { rx: number; ry: number; vx: number; vy: number };
  dirty: boolean;
  render?: () => void;
  resize?: () => void;
  dispose?: () => void;
};

const VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vN; varying vec3 vNo; varying vec3 vV;
  void main(){ vUv = uv; vNo = normal; vN = normalize(normalMatrix*normal);
    vec4 mv = modelViewMatrix*vec4(position,1.); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`;

const FRAG = /* glsl */ `
  uniform sampler2D map, smask, screenTex; uniform vec3 sideColor;
  uniform float shade, glint, tiltAmt, glass, flatGlass; uniform vec4 screenBox, fit; uniform vec3 srcSize;
  varying vec2 vUv; varying vec3 vN; varying vec3 vNo; varying vec3 vV;
  void main(){
    vec3 n = normalize(vN), v = normalize(vV), no = normalize(vNo);
    vec3 L = normalize(vec3(-0.45, 0.75, 0.55));
    vec3 tex = texture2D(map, vUv).rgb;
    float d = dot(n, L) - dot(no, L);
    float m = texture2D(smask, vUv).r;
    vec2 px = vec2(vUv.x*(srcSize.x + 2.0*srcSize.z) - srcSize.z, (1.0 - vUv.y)*(srcSize.y + 2.0*srcSize.z) - srcSize.z);
    vec2 su = (px - screenBox.xy) / (screenBox.zw - screenBox.xy);
    su = su*fit.xy + fit.zw;
    vec3 content = texture2D(screenTex, vec2(su.x, 1.0 - su.y)).rgb;
    vec3 scr = clamp(content + (tex - vec3(flatGlass))*glass, 0.0, 1.0);
    vec3 front = mix(tex * (1.0 + shade * d), scr, m);
    float lam = 0.55 + 0.45*max(dot(n, L), 0.0);
    float fres = pow(1.0 - abs(dot(n, v)), 3.0);
    float sheen = pow(max(dot(reflect(-L, n), v), 0.0), 18.0);
    float depthFade = smoothstep(-0.9, 0.3, no.z);
    vec3 side = sideColor * lam * mix(0.78, 1.0, depthFade) + sheen*0.22 + fres*0.12;
    float f = smoothstep(0.22, 0.55, no.z);
    vec3 col = mix(side, front, f);
    vec3 r = reflect(-v, n);
    float band = exp(-pow((r.x*0.75 + r.y*0.65 + 0.06) * 7.0, 2.0));
    col += band * glint * tiltAmt * (0.10 + 0.22*m) * f;
    gl_FragColor = vec4(col, 1.0);
  }`;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export class GeniePhonesScene {
  private phones: Phone[];
  private raf = 0;
  private last = performance.now();
  private disposed = false;
  private pointer = { x: 0, y: 0, active: false };
  private fine = matchMedia("(pointer: fine)").matches;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private visible = false;
  private io: IntersectionObserver;
  private ro: ResizeObserver;
  private cleanup: (() => void)[] = [];

  constructor(
    private root: HTMLElement,
    private onFail: () => void,
  ) {
    const els = [...root.querySelectorAll<HTMLElement>("[data-phone]")];
    this.phones = els.map((el, i) => {
      const def = cfg.phones.list[i];
      return {
        def,
        el,
        move: el.querySelector<HTMLElement>("[data-move]")!,
        tilt: el.querySelector<HTMLElement>("[data-tilt]")!,
        shadow: el.querySelector<HTMLElement>("[data-shadow]")!,
        strength: [1, 0.85, 0.7][def.ring],
        phase: Math.random() * 6.28,
        ry0: 0,
        spring: { rx: 0, ry: 0, vx: 0, vy: 0 },
        dirty: true,
      };
    });

    const onMove = (e: PointerEvent) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.active = true;
    };
    const onLeave = () => (this.pointer.active = false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    this.cleanup.push(() => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    });

    this.io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.start();
    });
    this.io.observe(root);
    this.ro = new ResizeObserver(() => this.phones.forEach((p) => p.resize?.()));
    this.ro.observe(root);

    this.init().catch((err) => {
      console.warn("3D phones unavailable, showing the flat layout", err);
      if (!this.disposed) onFail();
    });
  }

  private async init() {
    const { dir, model } = cfg.phones;
    const G: PhoneGeo = await fetch(`${dir}/phone-geo.json`).then((r) => r.json());
    if (this.disposed) return;
    const W = G.size[0], H = G.size[1], PAD = 24, U = 1 / 100;
    const V = ([x, y]: [number, number]) => new THREE.Vector2((x - G.cx) * U, -(y - H / 2) * U);

    let pts = G.inner.map(V);
    if (THREE.ShapeUtils.isClockWise(pts)) pts = pts.reverse();
    const BT = model.thick * 0.42, DEPTH = model.thick * 0.16;
    let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BT,
      bevelSize: G.bevel * U,
      bevelSegments: 20,
      curveSegments: 6,
    });
    geo.translate(0, 0, -DEPTH / 2);
    geo.deleteAttribute("uv");
    geo.deleteAttribute("normal");
    geo = mergeVertices(geo, 1e-4);
    geo.computeVertexNormals();
    {
      const pos = geo.attributes.position;
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const fx = pos.getX(i) / U + G.cx, fy = -pos.getY(i) / U + H / 2;
        uv[i * 2] = (fx + PAD) / (W + 2 * PAD);
        uv[i * 2 + 1] = 1 - (fy + PAD) / (H + 2 * PAD);
      }
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    }
    const ZF = DEPTH / 2 + BT;

    const loader = new THREE.TextureLoader();
    const loadTex = (src: string) =>
      new Promise<THREE.Texture>((res, rej) =>
        loader.load(
          src,
          (t) => {
            t.colorSpace = THREE.NoColorSpace;
            t.anisotropy = 8;
            res(t);
          },
          undefined,
          rej,
        ),
      );
    const smask = await loadTex(`${dir}/screenmask.png`);
    const SB = [28, 63, 551, 860], boxAspect = (SB[2] - SB[0]) / (SB[3] - SB[1]);

    const CW = W * U * (1 + 2 * MARGIN_X), CH = H * U * (1 + 2 * MARGIN_Y), FOV = 16;
    const DIST = CH / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

    await Promise.all(
      this.phones.map(async (p) => {
        const [front, screen] = await Promise.all([
          loadTex(`${dir}/front-${p.def.id}.webp`),
          loadTex(`${dir}/screen-${p.def.id}.webp`),
        ]);
        if (this.disposed) return;
        const img = screen.image as HTMLImageElement;
        const a = img.width / img.height;
        const fitV =
          a > boxAspect
            ? new THREE.Vector4(boxAspect / a, 1, (1 - boxAspect / a) / 2, 0)
            : new THREE.Vector4(1, a / boxAspect, 0, (1 - a / boxAspect) / 2);
        const canvas = document.createElement("canvas");
        p.tilt.appendChild(canvas);
        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        const scene = new THREE.Scene();
        const mat = new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          uniforms: {
            map: { value: front },
            smask: { value: smask },
            screenTex: { value: screen },
            sideColor: { value: new THREE.Color(...p.def.wall) },
            shade: { value: model.shade },
            glint: { value: model.glint },
            glass: { value: model.glass },
            tiltAmt: { value: 0 },
            flatGlass: { value: 25 / 255 },
            screenBox: { value: new THREE.Vector4(...SB) },
            srcSize: { value: new THREE.Vector3(W, H, PAD) },
            fit: { value: fitV },
          },
        });
        const group = new THREE.Group();
        group.add(new THREE.Mesh(geo, mat));
        scene.add(group);
        const camera = new THREE.PerspectiveCamera(FOV, CW / CH, 0.5, 300);
        camera.position.set(0, 0, ZF + DIST);
        camera.lookAt(0, 0, ZF);
        p.resize = () => {
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setSize(p.el.clientWidth, p.el.clientHeight, false);
          p.dirty = true;
        };
        p.resize();
        p.render = () => {
          group.rotation.x = THREE.MathUtils.degToRad(p.spring.rx);
          group.rotation.y = THREE.MathUtils.degToRad(p.spring.ry + p.ry0);
          mat.uniforms.tiltAmt.value = Math.min(1, Math.hypot(p.spring.rx, p.spring.ry + p.ry0) / 6);
          renderer.render(scene, camera);
        };
        p.dispose = () => {
          mat.dispose();
          front.dispose();
          screen.dispose();
          renderer.dispose();
          canvas.remove();
        };
      }),
    );
    if (this.disposed) {
      this.phones.forEach((p) => p.dispose?.());
      return;
    }
    this.cleanup.push(() => {
      geo.dispose();
      smask.dispose();
    });
    this.root.setAttribute("data-ready", "");
    this.start();
  }

  private start() {
    if (!this.raf && !this.disposed) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.disposed || !this.visible) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const { tiltMax, stiffness, damping, resist } = cfg.phones.gravity;
    const vw = window.innerWidth, vh = window.innerHeight;
    // Hidden page (section flags it) = nothing to draw.
    const pageOff = !!this.root.closest("[data-off]");

    for (const p of this.phones) {
      const ry0 = parseFloat(p.move.style.getPropertyValue("--ry")) || 0;
      if (Math.abs(ry0 - p.ry0) > 1e-3) {
        p.ry0 = ry0;
        p.dirty = true;
      }
      let tx = 0, ty = 0;
      if (!this.reduce) {
        if (this.pointer.active && this.fine) {
          const rc = p.el.getBoundingClientRect();
          const nx = (this.pointer.x - (rc.left + rc.width / 2)) / (vw * 0.5);
          const ny = (this.pointer.y - (rc.top + rc.height / 2)) / (vh * 0.5);
          ty = tiltMax * p.strength * Math.tanh(nx * resist);
          tx = tiltMax * 0.75 * p.strength * Math.tanh(ny * resist);
        } else if (!this.fine) {
          ty = Math.sin((now / 1000) * 0.7 + p.phase) * 4 * p.strength;
          tx = Math.cos((now / 1000) * 0.55 + p.phase) * 2.5 * p.strength;
        }
      }
      const s = p.spring, steps = 3, h = dt / steps;
      for (let i = 0; i < steps; i++) {
        s.vx += (stiffness * (tx - s.rx) - damping * s.vx) * h;
        s.vy += (stiffness * (ty - s.ry) - damping * s.vy) * h;
        s.rx += s.vx * h;
        s.ry += s.vy * h;
      }
      const moving =
        Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(tx - s.rx) + Math.abs(ty - s.ry) > 0.002;
      p.tilt.style.transform = `translate3d(${s.ry * 0.3}px, ${s.rx * 0.3}px, 0)`;
      p.shadow.style.setProperty("--shx", `${-s.ry * 1.1}px`);
      // GSAP writes opacity inline; the centre phone has none (always shown).
      const op = p.move.style.opacity;
      const shown = !pageOff && (op === "" || clamp(parseFloat(op)) > 0.001);
      if (p.render && shown && (moving || p.dirty)) {
        p.render();
        p.dirty = false;
      }
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.ro.disconnect();
    this.phones.forEach((p) => p.dispose?.());
    this.cleanup.forEach((f) => f());
  }
}

import * as THREE from "three";
import fragmentShader from "@/shaders/tear.frag";
import vertexShader from "@/shaders/tear.vert";
import { tearConfig, type TearConfig } from "./tear.config";

type Placement = { x: number; y: number; w: number; h: number };

/**
 * Cover-fit, top-aligned placement of an image in a viewport (CSS px).
 * `travel` (screen heights) keeps extra image below the fold for the banner scroll.
 * `shiftUp` crops that share of the image height off the top (moves the art up);
 * the image is scaled so the rest still covers the viewport.
 */
export function coverTop(
  imgW: number,
  imgH: number,
  vw: number,
  vh: number,
  shiftUp = 0,
  travel = 0,
): Placement {
  const keep = 1 - Math.min(Math.max(shiftUp, 0), 0.9);
  // Extra height below the fold so the banner can scroll up by `travel` screens without running out.
  const scale = Math.max(
    vw / imgW,
    (vh * (1 + Math.max(travel, 0))) / (imgH * keep),
  );
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: (vw - w) / 2, y: h * (1 - keep), w, h };
}

function loadTexture(renderer: THREE.WebGLRenderer, src: string) {
  return new THREE.TextureLoader().loadAsync(src).then((tex) => {
    // Raw sampling keeps the image colours identical to the <img> versions.
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = true;
    return tex;
  });
}

/** Full-screen quad running the paper-tear shader between two images. */
export class TearRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private geometry = new THREE.PlaneGeometry(2, 2);
  private material: THREE.ShaderMaterial;
  private textures: THREE.Texture[] = [];
  private size = [1, 1];

  constructor(
    private container: HTMLElement,
    private config: TearConfig = tearConfig,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, config.quality.maxPixelRatio),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        u_textureUpper: { value: null },
        u_progress: { value: 0 },
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(1, 1) },
        u_upperRect: { value: new THREE.Vector4(0, 1, 1, 0) },
        u_tearHeight: { value: 0 },
        u_tearStart: { value: 0 },
        u_edgeMorph: { value: 0 },
        u_burnWidth: { value: 0 },
        u_ridgeSize: { value: 0 },
        u_ridgeSpread: { value: 0 },
        u_tearRoughness: { value: 0 },
        u_surfaceScroll: { value: 0 },
        u_upperOffset: { value: 0 },
        u_tearAmplitude: { value: 0 },
        u_rashSpread: { value: 0 },
        u_rashDensity: { value: 0 },
        u_edgeVariation: { value: 0 },
        u_rashInner: { value: 0 },
        u_autoEdgeMovement: { value: 0 },
        u_edgeMovementIntensity: { value: 0 },
        u_edgeSpeed: { value: 0 },
        u_scrollVelocity: { value: 0 },
        u_fiberColor: { value: new THREE.Color() },
      },
    });
    this.applyConfig();
    this.scene.add(new THREE.Mesh(this.geometry, this.material));
  }

  /** Push tuning values from tear.config.ts into the shader. */
  applyConfig() {
    const { edge, motion } = this.config;
    const u = this.material.uniforms;
    u.u_burnWidth.value = edge.lipWidth;
    u.u_tearAmplitude.value = edge.amplitude;
    u.u_ridgeSize.value = edge.ridgeSize;
    u.u_ridgeSpread.value = edge.ridgeSpread;
    u.u_tearRoughness.value = edge.roughness;
    u.u_rashSpread.value = edge.rashSpread;
    u.u_rashDensity.value = edge.rashDensity;
    u.u_rashInner.value = edge.rashInner;
    u.u_edgeVariation.value = edge.variation;
    u.u_edgeMorph.value = edge.morph;
    (u.u_fiberColor.value as THREE.Color).set(edge.paperColor);
    u.u_surfaceScroll.value = motion.lowerScroll;
    u.u_autoEdgeMovement.value = motion.autoEdgeMovement ? 1 : 0;
    u.u_edgeMovementIntensity.value = motion.edgeMovementIntensity;
    u.u_edgeSpeed.value = motion.edgeSpeed;
  }

  async load(upperSrc: string) {
    const upper = await loadTexture(this.renderer, upperSrc);
    this.textures = [upper];
    this.material.uniforms.u_textureUpper.value = upper;
    const img = upper.image as { width: number; height: number };
    this.size = [img.width, img.height];
    this.resize();
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const u = this.material.uniforms;
    (u.u_resolution.value as THREE.Vector2).set(w, h);
    const up = coverTop(
      this.size[0],
      this.size[1],
      w,
      h,
      this.config.images.banner.shiftUp,
      this.config.motion.bannerTravel,
    );
    (u.u_upperRect.value as THREE.Vector4).set(up.x, up.w, up.h, up.y);
  }

  render(tearHeight: number, tearStart: number, progress: number, time = 0) {
    const u = this.material.uniforms;
    const { bannerTravel, bannerStopAt } = this.config.motion;
    const span = Math.max(bannerStopAt - tearStart, 1e-4);
    u.u_upperOffset.value =
      bannerTravel * Math.min(Math.max((tearHeight - tearStart) / span, 0), 1);
    u.u_time.value = time;
    u.u_tearHeight.value = tearHeight;
    u.u_tearStart.value = tearStart;
    u.u_progress.value = progress;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.textures.forEach((t) => t.dispose());
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

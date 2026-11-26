import * as THREE from "three";
import fragmentShader from "@/shaders/tear.frag";
import vertexShader from "@/shaders/tear.vert";
import { tearConfig, type TearConfig } from "./tear.config";

/**
 * How far the hero has drifted up (screen heights) for a given tear height:
 * it moves up slowly while the white edge rises, then stops at bannerStopAt.
 */
export function bannerOffset(
  tearHeight: number,
  tearStart: number,
  config: TearConfig = tearConfig,
) {
  const { bannerTravel, bannerStopAt } = config.motion;
  const span = Math.max(bannerStopAt - tearStart, 1e-4);
  return bannerTravel * Math.min(Math.max((tearHeight - tearStart) / span, 0), 1);
}

/**
 * Full-screen quad running the paper-tear shader. It only draws the paper
 * (lip, haze, flecks): the coded hero and the page underneath are DOM behind it.
 */
export class TearRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private geometry = new THREE.PlaneGeometry(2, 2);
  private material: THREE.ShaderMaterial;

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
        u_progress: { value: 0 },
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(1, 1) },
        u_tearHeight: { value: 0 },
        u_tearStart: { value: 0 },
        u_edgeMorph: { value: 0 },
        u_burnWidth: { value: 0 },
        u_ridgeSize: { value: 0 },
        u_ridgeSpread: { value: 0 },
        u_tearRoughness: { value: 0 },
        u_surfaceScroll: { value: 0 },
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
    this.resize();
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

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    (this.material.uniforms.u_resolution.value as THREE.Vector2).set(w, h);
  }

  render(tearHeight: number, tearStart: number, progress: number, time = 0) {
    const u = this.material.uniforms;
    u.u_time.value = time;
    u.u_tearHeight.value = tearHeight;
    u.u_tearStart.value = tearStart;
    u.u_progress.value = progress;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

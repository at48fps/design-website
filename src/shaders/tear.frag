// Paper tear transition between the hero banner and the quilt section.
// Source: paper-tearing-animation/src/shaders/burnShader.ts (edge, lip, fibre
// rashes and spill unchanged). Site changes: images are placed cover/top-aligned
// in CSS px so they match the DOM, and the tear height is driven by scroll.

uniform sampler2D u_textureUpper;
uniform float u_progress;
uniform float u_time;
uniform vec2 u_resolution;
// Image placement in CSS px: x offset, display width, display height, top crop (cover, top-aligned).
uniform vec4 u_upperRect;
// Tear centre line in uv.y, set from scroll (start position follows the design).
uniform float u_tearHeight;
uniform float u_tearStart;
// How much the torn contour changes shape over the full tear (repo default 3.2).
uniform float u_edgeMorph;

// Deckle paper ridge geometry
uniform float u_burnWidth;        // Width of the white deckle paper lip
uniform float u_ridgeSize;        // Height of the small ridges (very small by default)
uniform float u_ridgeSpread;      // Spreadness / horizontal wavelength of ridges
uniform float u_tearRoughness;    // Fine paper fiber frequency
uniform float u_surfaceScroll;    // Parallax scrolling for lower surface matching video
uniform float u_upperOffset;      // How far the upper artwork has scrolled up (screen heights)
uniform float u_tearAmplitude;    // Broad hand-torn undulation height
uniform float u_rashSpread;       // How far fiber rashes scatter above the edge
uniform float u_rashDensity;      // How many fiber rashes appear
uniform float u_edgeVariation;    // How much lip width and rashes vary along the tear
uniform float u_rashInner;        // How far rashes spread inward (into the lip and lower page)

// Edge movement & colors
uniform float u_autoEdgeMovement; // 0.0 (still) or 1.0 (auto simmer)
uniform float u_edgeMovementIntensity;
uniform float u_edgeSpeed;
uniform float u_scrollVelocity;   // Dynamic flex impulse while scrolling
uniform vec3 u_fiberColor;

varying vec2 vUv;

// Screen px (y from top) -> texture uv for a cover / top-aligned image.
vec2 placeUv(vec2 pxTop, vec4 rect) {
  vec2 t = vec2((pxTop.x - rect.x) / rect.y, (pxTop.y + rect.w) / rect.z);
  t = clamp(t, 0.0, 1.0);
  return vec2(t.x, 1.0 - t.y);
}

// 2D Simplex Noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Patchy variation along the tear in [-1, 1]; each seed gives an independent pattern
float edgeVary(float x, float m, float seed) {
  return snoise(vec2(x * 1.6 + seed, m * 0.35 + seed * 1.7)) * 0.6
       + snoise(vec2(x * 4.4 - seed * 2.3, m * 0.6 + seed)) * 0.4;
}

// Torn contour sampled along x, morphing along m (driven by scroll progress).
// Only smooth octaves: the contour stays soft and rounded; the torn look comes
// from the fuzzy fiber border, not from sharp spikes in the outline.
float tearProfile(float x, float m, float amp, float rSize) {
  // Broad hand-torn sweep across the width
  float broad = snoise(vec2(x * 0.85 + 0.42, m * 0.30 + 1.18)) * amp
              + snoise(vec2(x * 2.10 + 2.15, m * 0.55 + 3.42)) * amp * 0.45;

  // Occasional gentle dip where the tear sagged into the sheet
  float cleft = pow(max(snoise(vec2(x * 1.55 - 1.95, m * 0.45 + 2.3)), 0.0), 2.0) * amp * 0.9;

  // Soft rounded ridges
  float ridges = snoise(vec2(x * 5.0 + 0.7, m * 1.0 + 5.3)) * rSize * 0.8
               + snoise(vec2(x * 11.0 + 4.1, m * 1.4 + 7.8)) * rSize * 0.35
               + snoise(vec2(x * 24.0 + 1.9, m * 1.8 + 9.2)) * rSize * 0.12;

  return broad - cleft + ridges;
}

void main() {
  vec2 uv = vUv;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 px = uv * u_resolution;

  float spread = max(u_ridgeSpread, 0.2);
  float xScaled = (uv.x * aspect) / spread;
  float rSize = max(u_ridgeSize, 0.003);
  float amp = max(u_tearAmplitude, 0.0);

  // 1. EDGE MORPH: driven by scroll progress, so the contour changes only while
  // scrolling (and reverses when scrolling back). Optional auto simmer adds time.
  float morph = u_progress * u_edgeMorph
              + u_autoEdgeMovement * u_edgeMovementIntensity * u_time * u_edgeSpeed * 0.15;

  // 2. TEAR POSITION
  // u_progress = 0.0: tear below the screen, u_progress = 1.0: tear above the screen
  float tearHeight = u_tearHeight;
  float profile = tearProfile(xScaled, morph, amp, rSize);

  // dist < 0: revealed lower page, dist >= 0: deckle lip and upper page
  float dist = uv.y - (tearHeight + profile);
  float distPx = dist * u_resolution.y;
  float aa = 1.0 / max(u_resolution.y, 1.0);

  // 3. SURFACE SCROLLING
  // Upper artwork offset, computed on the CPU (scrolls a little, then stays static).
  float upperOffset = u_upperOffset;
  vec2 upperUv = placeUv(vec2(px.x, (1.0 - uv.y + upperOffset) * u_resolution.y), u_upperRect);
  // Lower page is the real DOM section behind this canvas (moved in JS), so the
  // canvas stays transparent there and only draws the banner, lip and flecks.

  vec3 upperCol = texture2D(u_textureUpper, upperUv).rgb;

  // 4. WHITE DECKLE LIP: gentle thickness variation along the tear
  // Lip width, rash reach and rash density each vary independently along the tear
  float variation = clamp(u_edgeVariation, 0.0, 1.0);
  float lipVary = max(1.0 + variation * 0.75 * edgeVary(xScaled, morph, 8.1), 0.25);
  float outerVary = max(1.0 + variation * 0.95 * edgeVary(xScaled, morph, 21.4), 0.0);
  float innerVary = max(1.0 + variation * 0.95 * edgeVary(xScaled, morph, 35.9), 0.0);
  float densityVary = variation * 0.3 * edgeVary(xScaled, morph, 47.2);
  float lip = max(u_burnWidth, 0.006) * lipVary;

  // Paper pulp: flat solid white with fine grain
  float fiberFreq = max(u_tearRoughness, 0.5) / 2.8;
  float grain = (snoise(px * vec2(0.12 * fiberFreq, 0.8)) * 0.5 + 0.5) * 0.05;
  vec3 white = u_fiberColor * (1.0 - grain);
  vec3 pulp = white;

  // Lumpy ink border: rounded cotton-like lumps of pulp (billow noise) along the
  // top of the lip, softened with a little fiber fuzz instead of a hard line.
  float lumps = snoise(vec2(px.x * 0.018 * fiberFreq + 11.0, morph * 1.8 + 4.0)) * 0.65
              + snoise(vec2(px.x * 0.045 * fiberFreq - 3.0, morph * 2.4 + 9.0)) * 0.35;
  float inkBorder = lip * (1.0 + 0.35 * lumps);
  float fuzz = lip * 0.3 + 2.0 * aa;
  float speckle = snoise(px * vec2(0.08 * fiberFreq, 0.28) + vec2(31.0, morph * 3.0)) * 0.65
                + snoise(px * vec2(0.2 * fiberFreq, 0.5) + vec2(-17.0, morph * 2.0)) * 0.35;
  float inkT = (dist - inkBorder) / fuzz;
  float inkA = smoothstep(-0.45, 0.45, inkT + speckle * 0.45);

  // Dusty grey haze on the artwork just above the lip, where pulp dust settled
  float hazeLen = lip * 1.2 + max(u_rashSpread, 0.0) * outerVary * 0.35 + aa;
  float hazeT = clamp((dist - inkBorder) / hazeLen, 0.0, 1.0);
  float hazeNoise = snoise(vec2(px.x * 0.03 * fiberFreq + 61.0, distPx * 0.12 + morph)) * 0.5 + 0.5;
  float hazeA = (1.0 - hazeT) * (1.0 - hazeT) * hazeNoise * 0.22 * step(0.0005, u_rashSpread);
  vec3 upperHazed = mix(upperCol, vec3(0.72, 0.71, 0.69), hazeA);

  vec3 paper = mix(pulp, upperHazed, inkA);

  // Fiber rashes: clumped grey-white flecks and detached paper bits scattered into
  // the artwork, thinning out with distance from the lip
  float rashLen = max(u_rashSpread, 0.0) * outerVary + aa;
  float rashT = clamp((dist - inkBorder) / rashLen, 0.0, 1.0);
  float clump = smoothstep(-0.2, 0.6, snoise(vec2(px.x * 0.012 * fiberFreq + 5.0, morph * 0.8 + 2.0)));
  float rashNoise = snoise(vec2(px.x * 0.11 * fiberFreq + 23.0, distPx * 0.40 + morph * 2.5)) * 0.65
                  + snoise(vec2(px.x * 0.30 * fiberFreq - 7.0, distPx * 0.90 - morph * 1.7)) * 0.35;
  float rashThreshold = mix(0.38, 0.9, rashT)
                      + (1.0 - clamp(u_rashDensity, 0.0, 1.0)) * 0.35
                      + (1.0 - clump) * 0.35 - densityVary;
  float rashA = smoothstep(rashThreshold, rashThreshold + 0.15, rashNoise)
              * (1.0 - rashT * rashT) * step(0.0, dist - inkBorder) * step(0.0005, u_rashSpread);
  float fleckTone = snoise(vec2(px.x * 0.05 + 3.0, distPx * 0.2 + 7.0)) * 0.5 + 0.5;
  vec3 fleckCol = mix(vec3(0.66, 0.65, 0.63), white, 0.45 + 0.55 * fleckTone);
  paper = mix(paper, fleckCol, rashA * 0.9);

  // Inner rashes: artwork specks scattered into the white lip, and pulp fibers
  // spilling past the shear onto the lower page. Same density control as outer.
  float innerLen = max(u_rashInner, 0.0) * innerVary + aa;
  float innerOn = step(0.0005, u_rashInner);
  float densityBias = (1.0 - clamp(u_rashDensity, 0.0, 1.0)) * 0.35 - densityVary;

  float inkInT = clamp((inkBorder - dist) / innerLen, 0.0, 1.0);
  float inkInNoise = snoise(vec2(px.x * 0.12 * fiberFreq - 41.0, distPx * 0.45 + morph * 2.2)) * 0.7
                   + snoise(vec2(px.x * 0.30 * fiberFreq + 13.0, distPx * 0.9 - morph * 1.4)) * 0.3;
  float inkInThreshold = mix(0.2, 0.9, inkInT) + densityBias;
  float inkInA = smoothstep(inkInThreshold, inkInThreshold + 0.18, inkInNoise)
               * (1.0 - inkInT) * step(0.0, dist) * step(dist, inkBorder) * innerOn;
  paper = mix(paper, upperCol * 0.9, inkInA * 0.8);

  float spillT = clamp(-dist / innerLen, 0.0, 1.0);
  float spillNoise = snoise(vec2(px.x * 0.11 * fiberFreq + 57.0, distPx * 0.40 - morph * 2.0)) * 0.7
                   + snoise(vec2(px.x * 0.30 * fiberFreq - 29.0, distPx * 0.9 + morph * 1.6)) * 0.3;
  float spillThreshold = mix(0.2, 0.9, spillT) + densityBias;
  float spillA = smoothstep(spillThreshold, spillThreshold + 0.18, spillNoise)
               * (1.0 - spillT) * step(dist, 0.0) * innerOn;
  vec4 lowerShaded = vec4(white * 0.95, spillA * 0.75);

  // 5. COMPOSITE: inner (shear) border gets the same rounded lumps and grainy
  // fuzz as the ink border, with its own independent pattern
  float innerLumps = snoise(vec2(px.x * 0.018 * fiberFreq - 23.0, morph * 1.8 + 13.0)) * 0.65
                   + snoise(vec2(px.x * 0.045 * fiberFreq + 7.0, morph * 2.4 + 17.0)) * 0.35;
  float shearBorder = -lip * 0.35 * innerLumps;
  float innerSpeckle = snoise(px * vec2(0.08 * fiberFreq, 0.28) + vec2(-53.0, morph * 3.0)) * 0.65
                     + snoise(px * vec2(0.2 * fiberFreq, 0.5) + vec2(41.0, morph * 2.0)) * 0.35;
  float edgeA = smoothstep(-0.45, 0.45, (dist - shearBorder) / fuzz + innerSpeckle * 0.45);
  vec4 col = mix(lowerShaded, vec4(paper, 1.0), edgeA);
  // Premultiplied alpha for the transparent canvas.
  gl_FragColor = vec4(col.rgb * col.a, col.a);
}

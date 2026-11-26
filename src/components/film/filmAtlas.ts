import * as THREE from 'three';
import type { FilmFrameItem } from './frames';

/** Font stacks for the text drawn into the frames (set from the page's next/font families). */
export const ATLAS_FONTS = {
  serif: '"Playfair Display", Georgia, serif',
  sans: '"Plus Jakarta Sans", sans-serif',
};

const CELL_SIZE = 1024;
const COLS = 4;
const ROWS = 2;
const ATLAS_WIDTH = CELL_SIZE * COLS; // 4096
const ATLAS_HEIGHT = CELL_SIZE * ROWS; // 2048

function loadHtmlImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  focusY = 0.42
): void {
  const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const boxRatio = dw / dh;

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (imgRatio > boxRatio) {
    sw = img.naturalHeight * boxRatio;
    sx = (img.naturalWidth - sw) * 0.5;
  } else {
    sh = img.naturalWidth / boxRatio;
    sy = (img.naturalHeight - sh) * focusY;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawFallbackGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: FilmFrameItem
): void {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#e8e6e1');
  grad.addColorStop(1, frame.accentColor);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = 'rgba(23, 23, 23, 0.72)';
  ctx.font = `600 42px ${ATLAS_FONTS.serif}`;
  ctx.textAlign = 'center';
  ctx.fillText(frame.title, x + w * 0.5, y + h * 0.5);
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawMagazineCoverCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  frame: FilmFrameItem,
  primaryImg: HTMLImageElement | null,
  secondaryImg: HTMLImageElement | null
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();

  // Crisp pure white editorial magazine paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);

  // Subtle top-left section tag
  ctx.fillStyle = '#71717a';
  ctx.font = `400 17px ${ATLAS_FONTS.sans}`;
  ctx.textAlign = 'left';
  ctx.fillText('Fashion Marketing  |  The Rise of Virtual AI', x + 52, y + 66);

  // Condensed tall uppercase bold serif headline matching screenshot
  ctx.fillStyle = '#18181b';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(x + size * 0.5, y + 172);
  ctx.scale(0.84, 1.18);
  ctx.font = `700 84px ${ATLAS_FONTS.serif}`;
  ctx.fillText("INDIA'S NEWEST IT", 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(x + size * 0.5, y + 252);
  ctx.scale(0.84, 1.12);
  ctx.font = `600 66px ${ATLAS_FONTS.serif}`;
  ctx.fillText("GIRL DOESN'T EXIST", 0, 0);
  ctx.restore();

  // Compact centered deck + byline
  ctx.fillStyle = '#3f3f46';
  ctx.font = `400 18px ${ATLAS_FONTS.sans}`;
  ctx.fillText(
    'Iara Sharma trains at 6:00 am, reads Murakami on mountain trips and wears her Asics',
    x + size * 0.5,
    y + 302
  );
  ctx.fillText(
    "better than you wear your Jordans. She's also entirely AI-made. Here's why she might",
    x + size * 0.5,
    y + 328
  );
  ctx.fillText(
    'be the smartest new shop window in Indian fashion.',
    x + size * 0.5,
    y + 354
  );

  ctx.fillStyle = '#71717a';
  ctx.font = `400 13px ${ATLAS_FONTS.sans}`;
  ctx.fillText('Ms. Bhavika Kumar, AI Design Curator at M3P, by Ritu & Roy, Bengaluru', x + size * 0.5, y + 392);
  ctx.fillText('Dr. Dolly Kamat, Associate Professor at NIFT, New Delhi', x + size * 0.5, y + 412);

  // Main studio close-up portrait occupying bottom half
  const photoX = x + 46;
  const photoY = y + 452;
  const photoW = size - 92;
  const photoH = size - 486;

  ctx.save();
  ctx.beginPath();
  ctx.rect(photoX, photoY, photoW, photoH);
  ctx.clip();
  if (primaryImg) {
    drawCoverImage(ctx, primaryImg, photoX, photoY, photoW, photoH, 0.24);
  } else {
    drawFallbackGradient(ctx, photoX, photoY, photoW, photoH, frame);
  }
  ctx.restore();

  // Inset white-bordered smaller portrait pinned with pale masking-tape corner accents
  if (secondaryImg) {
    const insetW = 264;
    const insetH = 336;
    const insetX = x + size - insetW - 44;
    const insetY = y + size - insetH - 52;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.14)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillRect(insetX, insetY, insetW, insetH);
    ctx.shadowColor = 'transparent';

    ctx.save();
    ctx.beginPath();
    ctx.rect(insetX + 14, insetY + 14, insetW - 28, insetH - 28);
    ctx.clip();
    drawCoverImage(ctx, secondaryImg, insetX + 14, insetY + 14, insetW - 28, insetH - 28, 0.22);
    ctx.restore();

    // Pale translucent tape strips matching screenshot
    ctx.save();
    ctx.fillStyle = 'rgba(222, 236, 245, 0.80)';
    ctx.translate(insetX + insetW * 0.52, insetY + 6);
    ctx.rotate(-0.04);
    ctx.fillRect(-58, -18, 116, 36);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(222, 236, 245, 0.78)';
    ctx.translate(insetX + 12, insetY + insetH - 18);
    ctx.rotate(0.68);
    ctx.fillRect(-46, -15, 92, 30);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(222, 236, 245, 0.75)';
    ctx.translate(photoX + 10, photoY + 26);
    ctx.rotate(0.18);
    ctx.fillRect(-34, -14, 72, 28);
    ctx.restore();
  }

  ctx.restore();
}

function drawEditorialSpreadCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  frame: FilmFrameItem,
  primaryImg: HTMLImageElement | null,
  secondaryImg: HTMLImageElement | null
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);

  // Subtle left-margin editorial context column
  ctx.fillStyle = '#c89b3c';
  ctx.font = `italic 600 32px ${ATLAS_FONTS.serif}`;
  ctx.textAlign = 'left';
  ctx.fillText('a Brand', x + 36, y + 124);

  ctx.fillStyle = '#9ca3af';
  ctx.font = `400 15px ${ATLAS_FONTS.sans}`;
  const marginNotes = [
    'Morning rituals',
    'in natural light,',
    'shot on 35mm',
    'without studio',
    'modifiers.',
  ];
  marginNotes.forEach((ln, i) => {
    ctx.fillText(ln, x + 36, y + 168 + i * 24);
  });

  // Top-right editorial matcha photo with dark "Iced Matcha" pill tag
  const imgX = x + 236;
  const imgY = y + 62;
  const imgW = 720;
  const imgH = 310;
  ctx.save();
  drawRoundedRectPath(ctx, imgX, imgY, imgW, imgH, 12);
  ctx.clip();
  if (primaryImg) {
    drawCoverImage(ctx, primaryImg, imgX, imgY, imgW, imgH, 0.3);
  } else {
    drawFallbackGradient(ctx, imgX, imgY, imgW, imgH, frame);
  }
  ctx.restore();

  if (secondaryImg) {
    ctx.save();
    drawRoundedRectPath(ctx, imgX + 410, imgY + 24, 284, 260, 10);
    ctx.clip();
    drawCoverImage(ctx, secondaryImg, imgX + 410, imgY + 24, 284, 260, 0.34);
    ctx.restore();
  }

  // Small dark "Iced Matcha" label inside top-left of photo
  ctx.fillStyle = 'rgba(24, 24, 27, 0.82)';
  drawRoundedRectPath(ctx, imgX + 34, imgY + 34, 152, 34, 17);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `500 17px ${ATLAS_FONTS.sans}`;
  ctx.textAlign = 'center';
  ctx.fillText('Iced Matcha', imgX + 110, imgY + 57);

  // Warm gold italic script heading matching screenshot
  ctx.fillStyle = '#d4a744';
  ctx.font = `italic 600 48px ${ATLAS_FONTS.serif}`;
  ctx.textAlign = 'left';
  ctx.fillText('...be Part of Her Day?', x + 150, y + 448);

  // Dense editorial body copy
  ctx.fillStyle = '#3f3f46';
  ctx.font = `400 18px ${ATLAS_FONTS.sans}`;
  const bodyLines = [
    "Iara doesn't do ads. She does favorites. If your shoe, bag, cafe,",
    "or matcha belongs in her day, it shows up in a relaxed, natural way.",
    "It'll be on her feet as she leaves a quiet morning courtyard, or",
    "in her hand beside sandstone arches before the midday light shifts.",
    '',
    'Working with her is simple:',
    'Tell us about your product. Send a short note and a reference.',
    'Our team maps how your object naturally belongs in her routine,',
    'whether in candid daylight portraits, café notes, or court drills.',
    'Every frame is color-graded to match tactile 35mm grain and tone.',
    'You review the contact sheet, approve the selects, and the story',
    'moves straight into editorial dispatches without heavy staging.',
  ];
  bodyLines.forEach((line, idx) => {
    if (line === 'Working with her is simple:') {
      ctx.fillStyle = '#18181b';
      ctx.font = `600 18px ${ATLAS_FONTS.sans}`;
    } else {
      ctx.fillStyle = '#52525b';
      ctx.font = `400 17px ${ATLAS_FONTS.sans}`;
    }
    ctx.fillText(line, x + 150, y + 492 + idx * 28);
  });

  // Crimson italic script footer heading matching screenshot
  ctx.fillStyle = '#c83b3b';
  ctx.font = `italic 600 44px ${ATLAS_FONTS.serif}`;
  ctx.fillText('The Proof of Concept', x + 150, y + 876);

  ctx.fillStyle = '#52525b';
  ctx.font = `400 17px ${ATLAS_FONTS.sans}`;
  ctx.fillText(
    'Right now, the archive proves an editorial persona can carry a',
    x + 150,
    y + 914
  );
  ctx.fillText(
    'distinctive visual rhythm across every roll without losing warmth.',
    x + 150,
    y + 940
  );
  ctx.fillStyle = '#18181b';
  ctx.font = `600 16px ${ATLAS_FONTS.sans}`;
  ctx.fillText(
    `${frame.location} · ${frame.filmStock} · Frame ${frame.code}`,
    x + 150,
    y + 972
  );

  ctx.restore();
}

function drawSocialContactCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  frame: FilmFrameItem,
  primaryImg: HTMLImageElement | null,
  secondaryImg: HTMLImageElement | null
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);

  // Crimson italic script heading matching screenshot
  ctx.fillStyle = '#c83b3b';
  ctx.font = `italic 600 46px ${ATLAS_FONTS.serif}`;
  ctx.textAlign = 'left';
  ctx.fillText('You can find her on Instagram.', x + 52, y + 92);

  // Three side-by-side Instagram post mockups
  const cards = [
    { cx: x + 52, cy: y + 132, cw: 300, ch: 468, img: primaryImg, focus: 0.32, handle: 'iara.sharma' },
    { cx: x + 366, cy: y + 118, cw: 300, ch: 468, img: secondaryImg ?? primaryImg, focus: 0.24, handle: 'iara.sharma' },
    { cx: x + 680, cy: y + 106, cw: 292, ch: 468, img: primaryImg ?? secondaryImg, focus: 0.56, handle: 'iara.sharma' },
  ];

  cards.forEach((card) => {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 2.5;
    drawRoundedRectPath(ctx, card.cx, card.cy, card.cw, card.ch, 10);
    ctx.fill();
    ctx.stroke();

    // Header avatar dot + username
    ctx.fillStyle = '#d4d4d8';
    ctx.beginPath();
    ctx.arc(card.cx + 24, card.cy + 26, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#18181b';
    ctx.font = `600 15px ${ATLAS_FONTS.sans}`;
    ctx.textAlign = 'left';
    ctx.fillText(card.handle, card.cx + 44, card.cy + 31);

    // Square-ish post image
    const pY = card.cy + 48;
    const pH = card.ch - 104;
    ctx.save();
    ctx.beginPath();
    ctx.rect(card.cx + 2, pY, card.cw - 4, pH);
    ctx.clip();
    if (card.img) {
      drawCoverImage(ctx, card.img, card.cx + 2, pY, card.cw - 4, pH, card.focus);
    } else {
      drawFallbackGradient(ctx, card.cx + 2, pY, card.cw - 4, pH, frame);
    }
    ctx.restore();

    // Minimal IG action icons (heart, comment, share)
    const iconY = card.cy + card.ch - 28;
    ctx.strokeStyle = '#c83b3b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(card.cx + 24, iconY, 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#71717a';
    ctx.beginPath();
    ctx.arc(card.cx + 50, iconY, 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(card.cx + 70, iconY - 6);
    ctx.lineTo(card.cx + 84, iconY);
    ctx.lineTo(card.cx + 70, iconY + 6);
    ctx.stroke();

    ctx.restore();
  });

  // Lower-left editorial notes
  ctx.fillStyle = '#52525b';
  ctx.font = `400 17px ${ATLAS_FONTS.sans}`;
  ctx.textAlign = 'left';
  const igNotes = [
    'Follow daily 35mm dispatches across morning courts,',
    'sunlit doorways, and candid print proofs. Each post',
    'documents natural daylight color and texture studies.',
  ];
  igNotes.forEach((ln, i) => {
    ctx.fillText(ln, x + 52, y + 662 + i * 26);
  });

  ctx.fillStyle = '#18181b';
  ctx.font = `600 17px ${ATLAS_FONTS.sans}`;
  ctx.fillText("Why Brands Notice a Girl Who Doesn't Exist", x + 52, y + 774);
  ctx.fillStyle = '#71717a';
  ctx.font = `400 16px ${ATLAS_FONTS.sans}`;
  ctx.fillText('Consistent visual voice across print, film, and digital', x + 52, y + 802);
  ctx.fillText('without losing the warmth of analog photography.', x + 52, y + 826);

  // Lower-right angled B&W photo contact strip collage
  ctx.save();
  ctx.translate(x + 760, y + 790);
  ctx.rotate(-0.18);
  ctx.fillStyle = '#1f1f23';
  drawRoundedRectPath(ctx, -210, -135, 420, 270, 10);
  ctx.fill();

  const bwImg = secondaryImg ?? primaryImg;
  if (bwImg) {
    ctx.save();
    ctx.filter = 'grayscale(100%) contrast(1.08)';
    for (let i = 0; i < 3; i++) {
      const bx = -194 + i * 134;
      ctx.save();
      drawRoundedRectPath(ctx, bx, -112, 120, 224, 6);
      ctx.clip();
      drawCoverImage(ctx, bwImg, bx, -112, 120, 224, 0.22 + i * 0.14);
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();

  ctx.restore();
}

export class FilmAtlasBuilder {
  public readonly canvas: HTMLCanvasElement;
  public readonly texture: THREE.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(maxAnisotropy: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ATLAS_WIDTH;
    this.canvas.height = ATLAS_HEIGHT;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not initialize 2D canvas context for film atlas');
    }
    this.ctx = ctx;

    // Neutral warm paper base before images finish decoding
    this.ctx.fillStyle = '#e4e3df';
    this.ctx.fillRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = true;
    this.texture.anisotropy = Math.min(16, maxAnisotropy);
  }

  public async renderFrames(frames: FilmFrameItem[]): Promise<void> {
    // Text is drawn with the page fonts: wait for them so the first draw isn't a fallback.
    if (typeof document !== 'undefined' && document.fonts) {
      await Promise.all(
        [
          `600 42px ${ATLAS_FONTS.serif}`,
          `italic 600 42px ${ATLAS_FONTS.serif}`,
          `700 42px ${ATLAS_FONTS.serif}`,
          `400 17px ${ATLAS_FONTS.sans}`,
          `600 17px ${ATLAS_FONTS.sans}`,
        ].map((f) => document.fonts.load(f).catch(() => undefined))
      );
    }
    // Load all unique URLs in parallel
    const uniqueUrls = new Set<string>();
    frames.forEach((f) => {
      uniqueUrls.add(f.imageUrl);
      if (f.secondaryImageUrl) uniqueUrls.add(f.secondaryImageUrl);
    });

    const loadedMap = new Map<string, HTMLImageElement | null>();
    await Promise.all(
      Array.from(uniqueUrls).map(async (url) => {
        const img = await loadHtmlImage(url);
        loadedMap.set(url, img);
      })
    );

    const ctx = this.ctx;
    ctx.fillStyle = '#e4e3df';
    ctx.fillRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);

    frames.slice(0, 8).forEach((frame, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;

      const primary = loadedMap.get(frame.imageUrl) ?? null;
      const secondary = frame.secondaryImageUrl
        ? (loadedMap.get(frame.secondaryImageUrl) ?? null)
        : null;

      if (frame.layoutKind === 'magazine-cover') {
        drawMagazineCoverCell(ctx, x, y, CELL_SIZE, frame, primary, secondary);
      } else if (frame.layoutKind === 'editorial-spread') {
        drawEditorialSpreadCell(ctx, x, y, CELL_SIZE, frame, primary, secondary);
      } else if (frame.layoutKind === 'social-contact') {
        drawSocialContactCell(ctx, x, y, CELL_SIZE, frame, primary, secondary);
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.clip();
        if (primary) {
          drawCoverImage(ctx, primary, x, y, CELL_SIZE, CELL_SIZE, 0.36);
        } else {
          drawFallbackGradient(ctx, x, y, CELL_SIZE, CELL_SIZE, frame);
        }
        ctx.restore();
      }
    });

    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.texture.dispose();
  }
}

export interface SheetRegions {
  [key: string]: [number, number, number, number];
}

const REGIONS: SheetRegions = {
  apple: [331, 630, 300, 310],
  golden: [630, 630, 300, 310],
  cherry: [450, 950, 330, 300],
  key: [880, 950, 350, 300],
};

interface FloodPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

function colorDist(a: FloodPixel, b: FloodPixel): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function extractRegion(
  img: HTMLImageElement,
  region: [number, number, number, number],
): HTMLCanvasElement | null {
  const [rx, ry, rw, rh] = region;
  const cw = Math.min(rw, img.width - rx);
  const ch = Math.min(rh, img.height - ry);
  if (cw <= 0 || ch <= 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, rx, ry, cw, ch, 0, 0, cw, ch);
  const data = ctx.getImageData(0, 0, cw, ch);
  const px = data.data;
  const read = (i: number): FloodPixel => ({
    r: px[i * 4],
    g: px[i * 4 + 1],
    b: px[i * 4 + 2],
    a: px[i * 4 + 3],
  });
  const visited = new Uint8Array(cw * ch);
  const queue: number[] = [];
  const push = (i: number): void => {
    if (!visited[i]) {
      visited[i] = 1;
      queue.push(i);
    }
  };
  for (let x = 0; x < cw; x++) {
    push(x);
    push((ch - 1) * cw + x);
  }
  for (let y = 0; y < ch; y++) {
    push(y * cw);
    push(y * cw + cw - 1);
  }
  const TOL = 26;
  while (queue.length) {
    const i = queue.pop()!;
    const cur = read(i);
    const cx = i % cw;
    const cy = (i / cw) | 0;
    const nb: [number, number][] = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ];
    for (const [nx, ny] of nb) {
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
      const ni = ny * cw + nx;
      if (visited[ni]) continue;
      if (colorDist(cur, read(ni)) < TOL) push(ni);
    }
  }
  let opaque = 0;
  for (let i = 0; i < cw * ch; i++) {
    if (visited[i]) {
      px[i * 4 + 3] = 0;
    } else {
      opaque++;
    }
  }
  const ratio = opaque / (cw * ch);
  if (ratio < 0.04 || ratio > 0.94) return null;
  let minX = cw;
  let minY = ch;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (!visited[y * cw + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(cw - 1, maxX + pad);
  maxY = Math.min(ch - 1, maxY + pad);
  const fw = maxX - minX + 1;
  const fh = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = fw;
  out.height = fh;
  const outCtx = out.getContext('2d')!;
  const outData = outCtx.createImageData(fw, fh);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const si = ((minY + y) * cw + (minX + x)) * 4;
      const di = (y * fw + x) * 4;
      outData.data[di] = px[si];
      outData.data[di + 1] = px[si + 1];
      outData.data[di + 2] = px[si + 2];
      outData.data[di + 3] = px[si + 3];
    }
  }
  outCtx.putImageData(outData, 0, 0);
  return out;
}

export async function loadSheet(
  url: string,
): Promise<Partial<Record<string, HTMLCanvasElement>>> {
  const img = new Image();
  img.src = url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('sheet no disponible'));
  });
  const out: Partial<Record<string, HTMLCanvasElement>> = {};
  for (const [name, region] of Object.entries(REGIONS)) {
    try {
      const spr = extractRegion(img, region);
      if (spr) out[name] = spr;
    } catch {
      console.warn(`No se pudo extraer el sprite ${name}`);
    }
  }
  return out;
}

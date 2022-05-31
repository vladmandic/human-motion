import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let triangulation: number[];

function point(pt: H.Point, pointSize: number, label?: string) {
  ctx.fillStyle = `rgba(${127.5 + (2 * (pt[2] || 0))}, ${127.5 - (2 * (pt[2] || 0))}, 255, 0.5)`;
  ctx.font = 'small-caps 18px Lato';
  if (label) ctx.fillText(label, pt[0] + pointSize, pt[1] + pointSize);
  ctx.beginPath();
  ctx.arc(pt[0], pt[1], pointSize, 0, 2 * Math.PI);
  ctx.fill();
}

function lines(points: H.Point[], rgbOffset: [number, number, number] = [0, 0, 0]) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const pt of points) {
    const z = pt[2] || 0;
    ctx.strokeStyle = `rgba(${127.5 + (2 * z) + rgbOffset[0]}, ${127.5 - (2 * z) + rgbOffset[1]}, ${255 + rgbOffset[2]}, 0.5)`;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineTo(pt[0], Math.round(pt[1]));
  }
  ctx.stroke();
}

async function body(scale: [number, number], result: H.BodyResult) {
  ctx.lineWidth = 12;
  for (const kpt of result.keypoints) { // draw point
    if (!kpt.score || (kpt.score === 0)) continue;
    const norm: H.Point = [kpt.position[0] / scale[0], kpt.position[1] / scale[1], kpt.position[2] as number];
    point(norm, 12, `${kpt.part} ${Math.trunc(100 * kpt.score)}%`);
  }
  for (const part of Object.values(result.annotations)) { // draw lines
    for (const points of part) {
      const norm: H.Point[] = points.map((p) => [p[0] / scale[0], p[1] / scale[1], p[2] as number]);
      lines(norm);
    }
  }
}

async function hand(scale: [number, number], result: Array<H.HandResult>) {
  ctx.lineJoin = 'round';
  for (const h of result) {
    for (const kpt of h.keypoints) {
      const norm: H.Point = [kpt[0] / scale[0], kpt[1] / scale[1], kpt[2] as number];
      point(norm, 12);
    }
    const addHandLine = (part: H.Point[]) => {
      if (!part || part.length === 0 || !part[0]) return;
      for (let i = 0; i < part.length; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${127.5 + (i * (part[i][2] || 0))}, ${127.5 - (i * 2 * (part[i][2] || 0))}, 255, 0.5)`;
        ctx.moveTo(part[i > 0 ? i - 1 : 0][0] / scale[0], part[i > 0 ? i - 1 : 0][1] / scale[1]);
        ctx.lineTo(part[i][0] / scale[0], part[i][1] / scale[1]);
        ctx.stroke();
      }
    };
    ctx.lineWidth = 12;
    addHandLine(h.annotations.index);
    addHandLine(h.annotations.middle);
    addHandLine(h.annotations.ring);
    addHandLine(h.annotations.pinky);
    addHandLine(h.annotations.thumb);
  }
}

export async function face(scale: [number, number], f: H.FaceResult, drawPoints: boolean, drawOutlines: boolean, drawMeshes: boolean) {
  if (!f.mesh || f.mesh.length !== 478) return;
  if (drawPoints) {
    for (const pt of f.meshRaw) point([pt[0] * canvas.width, pt[1] * canvas.height, pt[2]] as H.Point, 4);
  }
  ctx.lineWidth = 2;
  if (drawMeshes) {
    for (let i = 0; i < triangulation.length / 3; i++) {
      const points = [triangulation[i * 3 + 0], triangulation[i * 3 + 1], triangulation[i * 3 + 2]]
        .map((index) => [f.meshRaw[index][0] * canvas.width, f.meshRaw[index][1] * canvas.height, f.mesh[index][2]] as H.Point);
      lines(points);
    }
  }
  ctx.lineWidth = 4;
  if (drawOutlines) {
    for (const part of Object.keys(f.annotations)) {
      let rgbOffset: [number, number, number] = [0, 0, 0];
      if (part.startsWith('lips')) rgbOffset = [50, -25, -25];
      lines(f.annotations[part as H.FaceLandmark], rgbOffset);
    }
  }
  ctx.lineWidth = 2;
  if (f.annotations && f.annotations.leftEyeIris && f.annotations.leftEyeIris[0]) {
    ctx.strokeStyle = 'rgba(255, 200, 255, 1)';
    ctx.beginPath();
    const sizeX = Math.abs(f.annotations.leftEyeIris[3][0] - f.annotations.leftEyeIris[1][0]) / 2 / scale[0];
    const sizeY = Math.abs(f.annotations.leftEyeIris[4][1] - f.annotations.leftEyeIris[2][1]) / 2 / scale[1];
    ctx.ellipse(f.annotations.leftEyeIris[0][0] / scale[0], f.annotations.leftEyeIris[0][1] / scale[1], sizeX, sizeY, 0, 0, 2 * Math.PI);
    ctx.stroke();
  }
  if (f.annotations && f.annotations.rightEyeIris && f.annotations.rightEyeIris[0]) {
    ctx.strokeStyle = 'rgba(255, 200, 255, 1)';
    ctx.beginPath();
    const sizeX = Math.abs(f.annotations.rightEyeIris[3][0] - f.annotations.rightEyeIris[1][0]) / 2 / scale[0];
    const sizeY = Math.abs(f.annotations.rightEyeIris[4][1] - f.annotations.rightEyeIris[2][1]) / 2 / scale[1];
    ctx.ellipse(f.annotations.rightEyeIris[0][0] / scale[0], f.annotations.rightEyeIris[0][1] / scale[1], sizeX, sizeY, 0, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

export async function init(output: HTMLCanvasElement, faceTriangulation: number[]) {
  canvas = output;
  triangulation = faceTriangulation;
  ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
}

export async function draw(width: number, height: number, result: H.Result, input: HTMLVideoElement, drawPoints: boolean, drawOutlines: boolean, drawMeshes: boolean) {
  ctx.filter = 'grayscale(1) blur(8px)';
  ctx.drawImage(input, 0, 0);
  ctx.filter = 'none';
  const scale: [number, number] = [width / canvas.width, height / canvas.height];
  if (result && result.face && result.face[0]) await face(scale, result.face[0], drawPoints, drawOutlines, drawMeshes);
  if (result && result.body && result.body[0]) await body(scale, result.body[0]);
  if (result && result.hand && result.hand.length > 0) await hand(scale, result.hand);
}

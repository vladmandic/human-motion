import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here

import * as BABYLON from '@babylonjs/core';
import { Scene } from './scene';

let t: Scene;
let faceTriangulation: number[];
let faceUVMap: [number, number][];
let meshes: Record<string, BABYLON.Mesh> = {};
let faceVertexData: BABYLON.VertexData;

export function init(canvasOutput: HTMLCanvasElement, triangulation: number[], uvmap: [number, number][]) {
  if (!t) t = new Scene(canvasOutput, 2, 1000);
  // t.scene.debugLayer.show({ embedMode: true, overlay: false, showExplorer: true, showInspector: true });

  t.initialized = false;
  faceTriangulation = triangulation;
  faceUVMap = uvmap;
  for (const mesh of Object.values(meshes)) mesh.dispose();
  meshes = {};
}

export function centerCamera(ms: number, points: H.Point[]) {
  t.initialized = true;

  const moveCamera = (target: { x: number, y: number, z: number }, position: { x: number, y: number, z: number }) => {
    BABYLON.Animation.CreateAndStartAnimation('camera', t.camera, 'target.x', 60, 60 * ms / 1000, t.camera.target.x, target.x, 0, new BABYLON.SineEase());
    BABYLON.Animation.CreateAndStartAnimation('camera', t.camera, 'target.y', 60, 60 * ms / 1000, t.camera.target.y, target.y, 0, new BABYLON.SineEase());
    BABYLON.Animation.CreateAndStartAnimation('camera', t.camera, 'target.z', 60, 60 * ms / 1000, t.camera.target.z, target.z, 0, new BABYLON.SineEase());
    BABYLON.Animation.CreateAndStartAnimation('camera', t.camera, 'position.x', 60, 60 * ms / 1000, t.camera.position.x, position.x, 0, new BABYLON.SineEase());
    BABYLON.Animation.CreateAndStartAnimation('camera', t.camera, 'position.y', 60, 60 * ms / 1000, t.camera.position.y, position.y, 0, new BABYLON.SineEase());
    BABYLON.Animation.CreateAndStartAnimation('camera', t.camera, 'position.z', 60, 60 * ms / 1000, t.camera.position.z, position.z, 0, new BABYLON.SineEase());
    setTimeout(() => {
      t.camera.target = new BABYLON.Vector3(target.x, target.y, target.z);
      t.camera.position = new BABYLON.Vector3(position.x, position.y, position.z);
    }, 2 * ms);
  };

  const maxmin = (pts: H.Point[]): { max: number[], min: number[] } => {
    const min = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    const max = [Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
    for (const pt of pts) {
      if (pt[0] && pt[0] < min[0]) min[0] = pt[0];
      if (pt[1] && pt[1] < min[1]) min[1] = pt[1];
      if (pt[2] && pt[2] < min[2]) min[2] = pt[2];
      if (pt[0] && pt[0] > max[0]) max[0] = pt[0];
      if (pt[1] && pt[1] > max[1]) max[1] = pt[1];
      if (pt[2] && pt[2] > max[2]) max[2] = pt[2];
    }
    return { max, min };
  };

  const range = maxmin(points);
  const target = { x: (range.max[0] - range.min[0]) / 2 + range.min[0], y: (range.max[1] - range.min[1]) / 2 + range.min[1], z: 0 };
  const position = { x: (range.max[0] - range.min[0]) / 2 + range.min[0], y: range.max[1], z: -13 };
  moveCamera(target, position);
}

const pathLength = (path: Array<BABYLON.Vector3>): number => Math.abs(BABYLON.Vector3.Distance(path[0], path[path.length - 1]) * 0.1);

const drawPath = (desc: string, path: Array<BABYLON.Vector3>) => {
  if (!t.initialized) return;
  const diameter = 0.5 * pathLength(path) + 0.015;
  if (!meshes[desc]) { // body part seen for the first time
    meshes[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: diameter / 2, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, t.scene); // create new tube
    meshes[desc].material = t.materialBone;
    t.shadows.addShadowCaster(meshes[desc], false); // add shadow to new tube
    for (let i = 0; i < path.length; i++) {
      meshes[desc + i] = BABYLON.MeshBuilder.CreateSphere(desc + i, { diameter: 1 }, t.scene); // rounded edge for path // diameter is fixed and we change scale later
      meshes[desc + i].material = t.materialJoint;
      t.shadows.addShadowCaster(meshes[desc + i], false);
    }
  }
  meshes[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: diameter / 2, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE, instance: meshes[desc] }, t.scene); // update existing tube
  for (let i = 0; i < path.length; i++) { // update path endpoints
    meshes[desc + i].position = path[i];
    meshes[desc + i].scaling = new BABYLON.Vector3(1.1 * diameter, 1.1 * diameter, 1.1 * diameter); // make joints slightly larger than bones
  }
};

async function drawBody(result: H.BodyResult, scale: [number, number]) {
  const norm = (coord: number[]): BABYLON.Vector3 => new BABYLON.Vector3(coord[0] / scale[0], 1 - (coord[1] / scale[1]), coord[2] / 2 / 256);
  const center = (coord: number[][]): number[] => [(coord[0][0] + coord[1][0]) / coord.length, (coord[0][1] + coord[1][1]) / coord.length, (coord[0][2] + coord[1][2]) / coord.length];

  const drawHead = () => {
    if (!t.initialized) return;
    if (!meshes.head) {
      meshes.head = BABYLON.MeshBuilder.CreateSphere('head', { diameter: 0.1, updatable: true }, t.scene);
      meshes.head.material = t.materialHead;
    }
    const le = (result.keypoints.find((kpt) => kpt.part === 'leftEye') as H.BodyKeypoint).position as [number, number, number];
    const re = (result.keypoints.find((kpt) => kpt.part === 'rightEye') as H.BodyKeypoint).position as [number, number, number];
    const ls = (result.keypoints.find((kpt) => kpt.part === 'leftShoulder') as H.BodyKeypoint).position as [number, number, number];
    const rs = (result.keypoints.find((kpt) => kpt.part === 'rightShoulder') as H.BodyKeypoint).position as [number, number, number];
    const eyeBase = center([le, re]);
    const neckBase = center([ls, rs]);
    const neckEnd = center([neckBase, eyeBase]);
    const neck = [norm(neckBase), norm(neckEnd)];
    drawPath('neck', neck);
    const head = center([neckEnd, eyeBase]);
    meshes.head.position = norm(head);
    const headSize = 0.5 * pathLength([new BABYLON.Vector3(...le), new BABYLON.Vector3(...re)]) + 0.2; // head size is proportionate to distance between eyes
    meshes.head.scaling = new BABYLON.Vector3(headSize, 1.1 * headSize, headSize);
  };

  if (!t.initialized) centerCamera(1000, result.keypoints.filter((kpt) => kpt.score > 0).map((kpt) => kpt.positionRaw)); // first draw
  for (const [desc, parts] of Object.entries(result.annotations)) {
    const path: Array<BABYLON.Vector3> = [];
    for (const part of parts) {
      for (const pt of part) path.push(new BABYLON.Vector3(pt[0] / scale[0], 1 - (pt[1] / scale[1]), (pt[2] || 0) / 256 / 2)); // create path for each bone
    }
    drawPath(desc, path); // draw bone based on path
  }
  drawHead(); // draw head
}

async function drawHand(result: H.HandResult, scale: [number, number]) {
  if (!t.initialized) centerCamera(1000, result.keypoints.map((kpt) => [kpt[0] / scale[0], kpt[1] / scale[1], kpt[2] || 0])); // first draw
  for (const [desc, parts] of Object.entries(result.annotations)) {
    const path: Array<BABYLON.Vector3> = [];
    for (const pt of parts) {
      if (pt[0] > 0 && pt[1] > 0) path.push(new BABYLON.Vector3(pt[0] / scale[0], 1 - (pt[1] / scale[1]), (pt[2] || 0) / 256 / 2));
    }
    if (path.length > 1) drawPath(desc, path);
  }
}

export async function drawFace(result: H.FaceResult) {
  if (!t.initialized) centerCamera(1000, result.meshRaw); // first draw

  // draw face
  if (result.meshRaw.length < 468) return;
  if (!meshes.face) { // create new face
    meshes.face = new BABYLON.Mesh('face', t.scene);
    meshes.face.material = t.materialHead;
  }
  const positions = new Float32Array(3 * result.meshRaw.length);
  for (let i = 0; i < result.meshRaw.length; i++) { // flatten and invert-y
    positions[3 * i + 0] = result.meshRaw[i][0]; // x
    positions[3 * i + 1] = 1 - 1.25 * result.meshRaw[i][1]; // y
    positions[3 * i + 2] = (result.meshRaw[i][2] || 0) / 1.5; // z
  }

  // create vertex buffer if on first access
  if (!faceVertexData) {
    faceVertexData = new BABYLON.VertexData();
    faceVertexData.positions = positions;
    faceVertexData.indices = faceTriangulation;
    faceVertexData.uvs = faceUVMap.flat();
    faceVertexData.applyToMesh(meshes.face, true);
  }
  meshes.face.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true); // update uvmap positions

  // draw original image as texture
  /*
  const faceCanvasCtx = t.textureHead.getContext();
  const input = document.getElementById('input') as HTMLVideoElement;
  const box = [Math.trunc(input.videoWidth * result.boxRaw[0]), Math.trunc(input.videoHeight * result.boxRaw[1]), Math.trunc(input.videoWidth * result.boxRaw[2]), Math.trunc(input.videoHeight * result.boxRaw[3])];
  faceCanvasCtx.setTransform(1, 0, 0, -1, 0, faceCanvasCtx.canvas.height);
  faceCanvasCtx.drawImage(input, box[0], box[1], box[2], box[3], 0, 0, faceCanvasCtx.canvas.width, faceCanvasCtx.canvas.height);
  t.textureHead.update();
  */

  // draw eye iris
  if (result.meshRaw.length < 478) return;
  if (!meshes.leftEye || !meshes.rightEye) { // create new iris
    meshes.leftEye = BABYLON.MeshBuilder.CreateSphere('leftEye', { diameter: 0.5, updatable: true }, t.scene);
    meshes.rightEye = BABYLON.MeshBuilder.CreateSphere('rightEye', { diameter: 0.5, updatable: true }, t.scene);
    meshes.leftEye.renderingGroupId = 1;
    meshes.rightEye.renderingGroupId = 1;
    meshes.leftEye.material = t.materialJoint;
    meshes.rightEye.material = t.materialJoint;
  }
  const eyeSize = Math.abs(positions[3 * 469 + 0] - positions[3 * 471 + 0]) + Math.abs(positions[3 * 474 + 0] - positions[3 * 476 + 0]);
  meshes.leftEye.position = new BABYLON.Vector3(positions[3 * 468 + 0], positions[3 * 468 + 1], positions[3 * 468 + 2] / 10);
  meshes.leftEye.scaling = new BABYLON.Vector3(eyeSize, eyeSize, eyeSize);
  meshes.rightEye.position = new BABYLON.Vector3(positions[3 * 473 + 0], positions[3 * 473 + 1], positions[3 * 473 + 2] / 10);
  meshes.rightEye.scaling = new BABYLON.Vector3(eyeSize, eyeSize, eyeSize);

  for (let i = 478; i < result.meshRaw.length; i++) {
    const obj = `augment${i}`;
    if (!meshes[obj]) meshes[obj] = BABYLON.MeshBuilder.CreateSphere(obj, { diameter: 0.005, updatable: true }, t.scene);
    meshes[obj].position = new BABYLON.Vector3(positions[3 * i + 0], positions[3 * i + 1], positions[3 * i + 2] / 20);
  }
}

export async function draw(width: number, height: number, result: H.Result) {
  if (!t) return;
  if (result && result.body && result.body.length > 0) await drawBody(result.body[0], [width, height]);
  if (result && result.hand && result.hand.length > 0) await drawHand(result.hand[0], [width, height]);
  if (result && result.face && result.face.length > 0) await drawFace(result.face[0]);
}

import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here
import { Mesh, VertexData, MeshBuilder, LinesMesh } from '@babylonjs/core/Meshes';
import { SineEase, Animation } from '@babylonjs/core/Animations';
import { Vector3, Color3, Path3D } from '@babylonjs/core/Maths';
import { VertexBuffer } from '@babylonjs/core/Buffers';
import type { PBRMaterial } from '@babylonjs/core';
import '@babylonjs/inspector';
import { MyScene } from './scene';

let t: MyScene;
let faceTriangulation: number[];
let faceUVMap: [number, number][];
let meshes: Record<string, Mesh> = {};
let faceVertexData: VertexData | undefined;
let previousSmooth = false;
let paths: Record<string, Path3D> = {};
let outlines: Record<string, LinesMesh> = {};

export function init(canvasOutput: HTMLCanvasElement, triangulation: number[], uvmap: [number, number][]) {
  if (!t) t = new MyScene(canvasOutput, 2, 1000);
  // t.scene.debugLayer.show({ embedMode: true, overlay: true, showExplorer: true, showInspector: true });

  t.initialized = false;
  faceTriangulation = triangulation;
  faceUVMap = uvmap;
  for (const mesh of Object.values(meshes)) mesh.dispose();
  meshes = {};
  paths = {};
  outlines = {};
}

export function centerCamera(ms: number, points: H.Point[]) {
  t.initialized = true;

  const moveCamera = (target: { x: number, y: number, z: number }, position: { x: number, y: number, z: number }) => {
    Animation.CreateAndStartAnimation('camera', t.camera, 'target.x', 60, 60 * ms / 1000, t.camera.target.x, target.x, 0, new SineEase());
    Animation.CreateAndStartAnimation('camera', t.camera, 'target.y', 60, 60 * ms / 1000, t.camera.target.y, target.y, 0, new SineEase());
    Animation.CreateAndStartAnimation('camera', t.camera, 'target.z', 60, 60 * ms / 1000, t.camera.target.z, target.z, 0, new SineEase());
    Animation.CreateAndStartAnimation('camera', t.camera, 'position.x', 60, 60 * ms / 1000, t.camera.position.x, position.x, 0, new SineEase());
    Animation.CreateAndStartAnimation('camera', t.camera, 'position.y', 60, 60 * ms / 1000, t.camera.position.y, position.y, 0, new SineEase());
    Animation.CreateAndStartAnimation('camera', t.camera, 'position.z', 60, 60 * ms / 1000, t.camera.position.z, position.z, 0, new SineEase());
    setTimeout(() => {
      t.camera.target = new Vector3(target.x, target.y, target.z);
      t.camera.position = new Vector3(position.x, position.y, position.z);
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

const pathLength = (path: Array<Vector3>): number => Math.abs(Vector3.Distance(path[0], path[path.length - 1]) * 0.1);

const drawPath = (desc: string, path: Array<Vector3>) => {
  if (!t.initialized) return;
  const diameter = 0.75 * pathLength(path) + 0.01;
  if (!meshes[desc]) { // body part seen for the first time
    meshes[desc] = MeshBuilder.CreateTube(desc, { path, radius: diameter / 2, updatable: true, cap: 3, sideOrientation: Mesh.DOUBLESIDE }, t.scene); // create new tube
    meshes[desc].material = t.materialBone;
    t.shadows.addShadowCaster(meshes[desc], false); // add shadow to new tube
    for (let i = 0; i < path.length; i++) {
      meshes[desc + i] = MeshBuilder.CreateSphere(desc + i, { diameter: 1 }, t.scene); // rounded edge for path // diameter is fixed and we change scale later
      meshes[desc + i].material = t.materialJoint;
      t.shadows.addShadowCaster(meshes[desc + i], false);
    }
  }
  meshes[desc] = MeshBuilder.CreateTube(desc, { path, radius: diameter / 2, updatable: true, cap: 3, sideOrientation: Mesh.DOUBLESIDE, instance: meshes[desc] }, t.scene); // update existing tube
  for (let i = 0; i < path.length; i++) { // update path endpoints
    meshes[desc + i].position = path[i];
    meshes[desc + i].scaling = new Vector3(1.1 * diameter, 1.1 * diameter, 1.1 * diameter); // make joints slightly larger than bones
  }
};

async function drawBody(result: H.BodyResult, scale: [number, number]) {
  const norm = (coord: number[]): Vector3 => new Vector3(coord[0] / scale[0], 1 - (coord[1] / scale[1]), coord[2] / 2 / 256);
  const center = (coord: number[][]): number[] => [(coord[0][0] + coord[1][0]) / coord.length, (coord[0][1] + coord[1][1]) / coord.length, (coord[0][2] + coord[1][2]) / coord.length];

  const drawHead = () => {
    if (!t.initialized) return;
    if (!meshes.head) {
      meshes.head = MeshBuilder.CreateSphere('head', { diameter: 0.1, updatable: true }, t.scene);
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
    const headSize = 0.3 * pathLength([new Vector3(...le), new Vector3(...re)]) + 0.3; // head size is proportionate to distance between eyes
    meshes.head.scaling = new Vector3(headSize, headSize, headSize);
  };

  if (!t.initialized) centerCamera(1000, result.keypoints.filter((kpt) => kpt.score > 0).map((kpt) => kpt.positionRaw)); // first draw
  for (const [desc, parts] of Object.entries(result.annotations)) {
    const path: Array<Vector3> = [];
    for (const part of parts) {
      for (const pt of part) path.push(new Vector3(pt[0] / scale[0], 1 - (pt[1] / scale[1]), (pt[2] || 0) / 256 / 2)); // create path for each bone
    }
    drawPath(desc, path); // draw bone based on path
  }
  drawHead(); // draw head
}

async function drawHand(result: H.HandResult, scale: [number, number]) {
  if (!t.initialized) centerCamera(1000, result.keypoints.map((kpt) => [kpt[0] / scale[0], kpt[1] / scale[1], kpt[2] || 0])); // first draw
  for (const [desc, parts] of Object.entries(result.annotations)) {
    const path: Array<Vector3> = [];
    for (const pt of parts) {
      if (pt[0] > 0 && pt[1] > 0) path.push(new Vector3(pt[0] / scale[0], 1 - (pt[1] / scale[1]), (pt[2] || 0) / 127.5));
    }
    if (path.length > 1) drawPath(desc, path);
  }
}

export async function drawFace(result: H.FaceResult, scale: [number, number], useWireframe: boolean, smooth: boolean, drawOutlines: boolean) {
  if (!t.initialized) centerCamera(1000, result.meshRaw); // first draw

  if (previousSmooth !== smooth) {
    meshes.face.dispose();
    previousSmooth = smooth;
  }

  // draw face
  if (result.meshRaw.length < 468) return;
  if (!meshes.face || meshes.face.isDisposed()) { // create new face
    meshes.face = new Mesh('face', t.scene);
    meshes.face.material = t.materialHead;
    faceVertexData = undefined;
  }
  if (meshes.face && meshes.face.material) meshes.face.material.wireframe = useWireframe;
  (meshes.face.material as PBRMaterial).roughness = smooth ? 0.25 : 0.65;
  (meshes.face.material as PBRMaterial).metallic = smooth ? 1.0 : 0.65;

  // use fixed size since iris does not have defined uvmap
  let positions = new Float32Array(3 * 468);
  for (let i = 0; i < 468; i++) { // flatten and invert-y
    positions[3 * i + 0] = result.meshRaw[i][0]; // x
    positions[3 * i + 1] = 1 - 1.25 * result.meshRaw[i][1]; // y
    positions[3 * i + 2] = (result.meshRaw[i][2] || 0) / 2; // z
  }

  // create vertex buffer if on first access
  if (!faceVertexData) {
    faceVertexData = new VertexData();
    faceVertexData.positions = positions;
    faceVertexData.indices = faceTriangulation;
    faceVertexData.uvs = faceUVMap.flat();
    if (smooth) {
      const normals: number[] = [];
      VertexData.ComputeNormals(positions, faceTriangulation, normals);
      faceVertexData.normals = normals;
    } else {
      faceVertexData.normals = null;
    }
    faceVertexData.applyToMesh(meshes.face, true);
  }
  meshes.face.updateVerticesData(VertexBuffer.PositionKind, positions, true);

  // draw eye iris
  if (result.meshRaw.length < 478) return;
  if (!meshes.leftEye || !meshes.rightEye) { // create new iris
    meshes.leftEye = MeshBuilder.CreateSphere('leftEye', { diameter: 0.5, updatable: true }, t.scene);
    meshes.rightEye = MeshBuilder.CreateSphere('rightEye', { diameter: 0.5, updatable: true }, t.scene);
    meshes.leftEye.renderingGroupId = 1;
    meshes.rightEye.renderingGroupId = 1;
    meshes.leftEye.material = t.materialJoint;
    meshes.rightEye.material = t.materialJoint;
  }

  // now add iris positions
  positions = new Float32Array(3 * 478);
  for (let i = 468; i < 478; i++) { // flatten and invert-y
    positions[3 * i + 0] = result.meshRaw[i][0]; // x
    positions[3 * i + 1] = 1 - 1.25 * result.meshRaw[i][1]; // y
    positions[3 * i + 2] = (result.meshRaw[i][2] || 0) / 2; // z
  }
  const eyeSize = Math.abs(positions[3 * 469 + 0] - positions[3 * 471 + 0]) + Math.abs(positions[3 * 474 + 0] - positions[3 * 476 + 0]);
  meshes.leftEye.position = new Vector3(positions[3 * 468 + 0], positions[3 * 468 + 1], positions[3 * 468 + 2] / 10);
  meshes.leftEye.scaling = new Vector3(eyeSize, eyeSize, eyeSize);
  meshes.rightEye.position = new Vector3(positions[3 * 473 + 0], positions[3 * 473 + 1], positions[3 * 473 + 2] / 10);
  meshes.rightEye.scaling = new Vector3(eyeSize, eyeSize, eyeSize);

  // draw outlines
  for (const part of Object.keys(result.annotations)) {
    if (!part.startsWith('lips')) continue; // draw just lips although all work
    if (drawOutlines) {
      const points = result.annotations[part as H.FaceLandmark].map((pt) => new Vector3(pt[0] / scale[0], 1 - 1.25 * (pt[1] / scale[1]), (pt[2] || 0) / ((scale[0] + scale[1] / 2)) - 0.04));
      if (!paths[part]) paths[part] = new Path3D(points);
      else paths[part].update(points);
      const curve = paths[part].getCurve();
      if (!outlines[part] || outlines[part].isDisposed()) {
        outlines[part] = MeshBuilder.CreateLines(part, { points: curve, updatable: true }, t.scene);
        let color: Color3;
        if (part.startsWith('lips')) color = Color3.FromHexString('#FF9090');
        else if (part.startsWith('left')) color = Color3.FromHexString('#868686');
        else if (part.startsWith('right')) color = Color3.FromHexString('#868686');
        else color = Color3.FromHexString('#1FC4FF');
        outlines[part].color = color;
      } else {
        outlines[part] = MeshBuilder.CreateLines(part, { points: curve, instance: outlines[part], updatable: true }, t.scene);
      }
    } else if (outlines[part] && !outlines[part].isDisposed()) {
      outlines[part].dispose();
    }
  }
}

export async function draw(width: number, height: number, result: H.Result, useWireframe: boolean, smooth: boolean, drawOutlines: boolean) {
  if (!t) return;
  if (result && result.body && result.body.length > 0) await drawBody(result.body[0], [width, height]);
  if (result && result.hand && result.hand.length > 0) await drawHand(result.hand[0], [width, height]);
  if (result && result.face && result.face.length > 0) await drawFace(result.face[0], [width, height], useWireframe, smooth, drawOutlines);
}

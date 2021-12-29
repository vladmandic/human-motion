import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here
import * as BABYLON from 'babylonjs';
import { Scene } from './scene';

let t: Scene;
let faceTriangulation: number[];
let meshes: Record<string, BABYLON.Mesh> = {};

export function init(canvasOutput: HTMLCanvasElement, triangulation: number[]) {
  if (!t) t = new Scene(canvasOutput, 2, 1000);
  t.initialized = false;
  faceTriangulation = triangulation;
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
  console.log({ target, position, range });
}

const pathLength = (path: Array<BABYLON.Vector3>): number => Math.abs(BABYLON.Vector3.Distance(path[0], path[path.length - 1]) * 0.1);

const drawPath = (desc: string, path: Array<BABYLON.Vector3>) => {
  if (!t.initialized) return;
  const diameter = pathLength(path) + 0.005;
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
    meshes.head.position = new BABYLON.Vector3((le[0] + re[0]) / 2 / scale[0], 1 - ((le[1] + re[1]) / 2 / scale[1]), (le[2] + re[2] + ls[2] + rs[2]) / 4 / 256 / 2); // head position is half way between both eyes and shoulders
    const headSize = 0.8 * pathLength([new BABYLON.Vector3(...le), new BABYLON.Vector3(...re)]); // head size is proportionate to distance between eyes
    meshes.head.scaling = new BABYLON.Vector3(headSize, headSize, headSize);
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
      if (pt[0] > 0 && pt[1] > 0) {
        path.push(new BABYLON.Vector3(pt[0] / scale[0], 1 - (pt[1] / scale[1]), (pt[2] || 0) / 256 / 2));
      }
    }
    if (path.length > 1) drawPath(desc, path);
  }
}

export async function drawFace(result: H.FaceResult) {
  if (!t.initialized) centerCamera(1000, result.meshRaw); // first draw
  if (result.meshRaw.length !== 478) return;
  if (!meshes.face) { // create new face
    meshes.face = new BABYLON.Mesh('face', t.scene);
    meshes.leftEye = BABYLON.MeshBuilder.CreateSphere('leftEye', { diameter: 0.5, updatable: true }, t.scene);
    meshes.rightEye = BABYLON.MeshBuilder.CreateSphere('rightEye', { diameter: 0.5, updatable: true }, t.scene);
    meshes.face.material = t.materialHead;
    meshes.leftEye.material = t.materialJoint;
    meshes.rightEye.material = t.materialJoint;
  }
  const positions = new Float32Array(3 * result.meshRaw.length);
  for (let i = 0; i < result.meshRaw.length; i++) { // flatten and invert-y
    positions[3 * i + 0] = result.meshRaw[i][0];
    positions[3 * i + 1] = 1 - 1.25 * result.meshRaw[i][1];
    positions[3 * i + 2] = (result.meshRaw[i][2] || 0) / 2;
  }
  const faceVertexData: BABYLON.VertexData = new BABYLON.VertexData();
  faceVertexData.positions = positions;
  faceVertexData.indices = faceTriangulation;
  faceVertexData.applyToMesh(meshes.face, true);

  const eyeSize = Math.abs(positions[3 * 469 + 0] - positions[3 * 471 + 0]) + Math.abs(positions[3 * 474 + 0] - positions[3 * 476 + 0]);
  meshes.leftEye.position = new BABYLON.Vector3(positions[3 * 468 + 0], positions[3 * 468 + 1], positions[3 * 468 + 2] / 20);
  meshes.leftEye.scaling = new BABYLON.Vector3(eyeSize, eyeSize, eyeSize);
  meshes.rightEye.position = new BABYLON.Vector3(positions[3 * 473 + 0], positions[3 * 473 + 1], positions[3 * 473 + 2] / 20);
  meshes.rightEye.scaling = new BABYLON.Vector3(eyeSize, eyeSize, eyeSize);
}

export async function draw(width: number, height: number, result: H.Result) {
  if (!t) return;
  if (result && result.body && result.body.length > 0) await drawBody(result.body[0], [width, height]);
  if (result && result.hand && result.hand.length > 0) await drawHand(result.hand[0], [width, height]);
  if (result && result.face && result.face.length > 0) await drawFace(result.face[0]);
}

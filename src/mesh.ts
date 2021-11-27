import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here
import * as BABYLON from 'babylonjs';
import * as environment from './environment';

let t: environment.Scene;
let faceTriangulation: number[];
let faceMesh: BABYLON.Mesh;
let leftEye: BABYLON.Mesh;
let rightEye: BABYLON.Mesh;
const handTubes: Record<string, BABYLON.Mesh> = {};
const bodyTubes: Record<string, BABYLON.Mesh> = {};

export async function init(canvasOutput: HTMLCanvasElement, triangulation: number[]) {
  if (!t) t = new environment.Scene(canvasOutput);
  // register globals
  faceTriangulation = triangulation;
  // cleanup hand
  Object.keys(handTubes).forEach((part) => handTubes[part].dispose());
  Object.keys(handTubes).forEach((part) => delete handTubes[part]);
  // cleanup body
  Object.keys(bodyTubes).forEach((part) => bodyTubes[part].dispose());
  Object.keys(bodyTubes).forEach((part) => delete bodyTubes[part]);
  // cleanup face
  if (faceMesh) faceMesh.dispose();
}

export async function position(target: string) {
  // clean up
  if (target === '') {
    //
  } else if (target === 'face') {
    t.camera.setPosition(new BABYLON.Vector3(0.7, 1.3, -1.3));
    t.camera.setTarget(new BABYLON.Vector3(0.7, 1.3, 0));
    t.light.position = new BABYLON.Vector3(0.0, 5.0, 5.0);
    t.light.direction = new BABYLON.Vector3(0.7, 0.0, 0.3);
  } else if (target === 'hand') {
    t.camera.setPosition(new BABYLON.Vector3(0.5, 0.5, -1.25));
    t.camera.setTarget(new BABYLON.Vector3(0.5, 0.5, 0));
    t.light.position = new BABYLON.Vector3(1.0, 5.0, 1.0);
    t.light.direction = new BABYLON.Vector3(2.5, -4.0, 2.0);
  } else if (target === 'body') {
    t.camera.setPosition(new BABYLON.Vector3(0.5, 0.75, -1.5));
    t.camera.setTarget(new BABYLON.Vector3(0.5, 0.5, 0));
    t.light.position = new BABYLON.Vector3(0.0, 5.0, 5.0);
    t.light.direction = new BABYLON.Vector3(-0.5, 0.5, -1);
  }
}

async function body(result: H.BodyResult, scale: [number, number]) {
  for (const [desc, parts] of Object.entries(result.annotations)) {
    const path: Array<BABYLON.Vector3> = [];
    for (const part of parts) {
      for (const pt of part) {
        if (pt[0] > 0 && pt[1] > 0) {
          path.push(new BABYLON.Vector3(pt[0] / scale[0], 1 - (pt[1] / scale[1]), (pt[2] || 0) / 256 / 2));
        }
      }
    }
    if (path.length < 2) { // body part had no info in this frame so we need to delete it or it presents as ghost
      t.scene.meshes.find((mesh) => mesh.name === desc)?.dispose();
      if (bodyTubes[desc]) bodyTubes[desc].dispose();
      delete bodyTubes[desc];
    } else if (!bodyTubes[desc]) { // body part seen for the first time
      bodyTubes[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, t.scene); // create new tube
      bodyTubes[desc].material = t.material;
      t.shadows.addShadowCaster(bodyTubes[desc], false); // add shadow to new tube
    } else { // updating existing body part
      bodyTubes[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE, instance: bodyTubes[desc] }, t.scene); // update existing tube
    }
  }
}

async function hand(result: H.HandResult, scale: [number, number]) {
  for (const [desc, parts] of Object.entries(result.annotations)) {
    const path: Array<BABYLON.Vector3> = [];
    for (const pt of parts) {
      if (pt[0] > 0 && pt[1] > 0) {
        path.push(new BABYLON.Vector3(pt[0] / scale[0], 1 - (pt[1] / scale[1]), (pt[2] || 0) / 256 / 2));
      }
    }
    if (path.length < 2) { // body part had no info in this frame so we need to delete it or it presents as ghost
      t.scene.meshes.find((mesh) => mesh.name === desc)?.dispose();
      if (handTubes[desc]) handTubes[desc].dispose();
      delete handTubes[desc];
    } else if (!handTubes[desc]) { // body part seen for the first time
      handTubes[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, t.scene); // create new tube
      handTubes[desc].material = t.material;
      t.shadows.addShadowCaster(handTubes[desc], false); // add shadow to new tube
    } else { // updating existing body part
      handTubes[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE, instance: handTubes[desc] }, t.scene); // update existing tube
    }
  }
}

export async function face(result: H.FaceResult) {
  if (!leftEye || !rightEye || !faceMesh) {
    faceMesh = new BABYLON.Mesh('face', t.scene);
    faceMesh.material = t.material;
    leftEye = BABYLON.MeshBuilder.CreateSphere('leftEye', { diameter: 0.1, updatable: true }, t.scene);
    rightEye = BABYLON.MeshBuilder.CreateSphere('rightEye', { diameter: 0.1, updatable: true }, t.scene);
    leftEye.material = t.material;
    rightEye.material = t.material;
  }
  if (result.meshRaw.length !== 478) return;
  const positions = new Float32Array(3 * result.meshRaw.length);
  for (let i = 0; i < result.meshRaw.length; i++) { // normalize and invert
    positions[3 * i + 0] = 1.50 * result.meshRaw[i][0];
    positions[3 * i + 1] = 1.75 * -result.meshRaw[i][1] + 2;
    positions[3 * i + 2] = 0.75 * (result.meshRaw[i][2] as number);
  }
  const faceVertexData: BABYLON.VertexData = new BABYLON.VertexData();
  faceVertexData.positions = positions;
  faceVertexData.indices = faceTriangulation;
  faceVertexData.applyToMesh(faceMesh, true);

  const eyeSize = 5 * (Math.abs(positions[3 * 469 + 0] - positions[3 * 471 + 0]) + Math.abs(positions[3 * 474 + 0] - positions[3 * 476 + 0]));
  leftEye.position = new BABYLON.Vector3(positions[3 * 468 + 0], positions[3 * 468 + 1], positions[3 * 468 + 2] / 20);
  leftEye.scaling = new BABYLON.Vector3(eyeSize, eyeSize, eyeSize);
  rightEye.position = new BABYLON.Vector3(positions[3 * 473 + 0], positions[3 * 473 + 1], positions[3 * 473 + 2] / 20);
  rightEye.scaling = new BABYLON.Vector3(eyeSize, eyeSize, eyeSize);
}

export async function draw(width: number, height: number, result: H.Result) {
  if (!t) return;
  if (result && result.body && result.body[0]) await body(result.body[0], [width, height]);
  if (result && result.hand && result.hand.length > 0) await hand(result.hand[0], [width, height]);
  if (result && result.face && result.face.length > 0) await face(result.face[0]);
}

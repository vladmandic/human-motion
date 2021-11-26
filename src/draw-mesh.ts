import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here
import * as BABYLON from 'babylonjs';

let canvas: HTMLCanvasElement;
let engine: BABYLON.Engine;
let scene: BABYLON.Scene;
let camera: BABYLON.ArcRotateCamera;
let shadows: BABYLON.ShadowGenerator;
let material: BABYLON.StandardMaterial;
let light: BABYLON.DirectionalLight;
let faceTriangulation: number[];
let faceMesh: BABYLON.Mesh;
let leftEye: BABYLON.Mesh;
let rightEye: BABYLON.Mesh;

const handTubes: Record<string, BABYLON.Mesh> = {};
const bodyTubes: Record<string, BABYLON.Mesh> = {};
export interface CustomWindow extends Window {
  engine: BABYLON.Engine,
  scene: BABYLON.Scene,
  camera: BABYLON.Camera,
  light: BABYLON.DirectionalLight,
  meshes: BABYLON.AbstractMesh[],
  shadows: BABYLON.ShadowGenerator,
  path: Record<string, BABYLON.Vector3[]>,
}
declare let window: CustomWindow;

const wait = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms); });

export async function init(output: HTMLCanvasElement, triangulation: number[]) {
  canvas = output;
  console.log('initializing mesh');

  // cleanup
  if (scene) scene.dispose();
  if (engine) engine.dispose();
  await wait(100);

  // engine and scene
  engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false });
  engine.enableOfflineSupport = false;
  BABYLON.Animation.AllowMatricesInterpolation = true;
  scene = new BABYLON.Scene(engine);

  // camera
  camera = new BABYLON.ArcRotateCamera('camera1', 4.7, 1.6, 2, new BABYLON.Vector3(0.5, 0.5, 0.5), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 10;
  camera.wheelDeltaPercentage = 0.01;

  // create environment
  const environment = scene.createDefaultEnvironment({
    createSkybox: true,
    createGround: true,
    enableGroundShadow: true,
    groundColor: BABYLON.Color3.Red(),
  }) as BABYLON.EnvironmentHelper;
  environment.setMainColor(BABYLON.Color3.Gray());

  // lights
  const lightSphere = new BABYLON.HemisphericLight('spheric', new BABYLON.Vector3(0, 1, 0), scene);
  lightSphere.intensity = 0.6;
  lightSphere.specular = BABYLON.Color3.Black();
  light = new BABYLON.DirectionalLight('directional', new BABYLON.Vector3(0, -0.5, -1.0), scene);
  light.position = new BABYLON.Vector3(0, 5, 5);
  shadows = new BABYLON.ShadowGenerator(1024, light);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 32;
  // shadowGenerator.addShadowCaster(scene.meshes[0], true);

  if (material) material.dispose();
  material = new BABYLON.StandardMaterial('material', scene);
  material.diffuseColor = new BABYLON.Color3(0, 0.85, 1.0);

  // structures for facemesh
  faceTriangulation = triangulation;
  if (faceMesh) faceMesh.dispose();
  faceMesh = new BABYLON.Mesh('face', scene);
  faceMesh.material = material;

  // rendering loop
  engine.runRenderLoop(() => scene.render());

  // expose on global object for diagnostics
  window.engine = engine;
  window.scene = scene;
  window.camera = camera;
  window.meshes = scene.meshes;
  window.light = light;
  window.shadows = shadows;
  window.path = {};
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
      scene.meshes.find((mesh) => mesh.name === desc)?.dispose();
      if (bodyTubes[desc]) bodyTubes[desc].dispose();
      delete bodyTubes[desc];
    } else if (!bodyTubes[desc]) { // body part seen for the first time
      bodyTubes[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene); // create new tube
      bodyTubes[desc].material = material;
      shadows.addShadowCaster(bodyTubes[desc], false); // add shadow to new tube
    } else { // updating existing body part
      try {
        bodyTubes[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE, instance: bodyTubes[desc] }, scene); // update existing tube
      } catch { // cannot update so cleanup mesh
        console.log('update error:', { desc, path, existing: bodyTubes[desc] });
        scene.meshes.find((mesh) => mesh.name === desc)?.dispose();
        if (bodyTubes[desc]) bodyTubes[desc].dispose();
        delete bodyTubes[desc];
      }
    }
  }
}

export async function position(target: string) {
  // clean up
  await init(canvas, faceTriangulation);

  console.log('update position:', target);
  if (target === '') {
    //
  } else if (target === 'face') {
    camera.setPosition(new BABYLON.Vector3(0.7, 1.3, -1.3));
    camera.setTarget(new BABYLON.Vector3(0.7, 1.3, 0));
    light.position = new BABYLON.Vector3(0.0, 5.0, 5.0);
    light.direction = new BABYLON.Vector3(0.7, 0.0, 0.3);
  } else if (target === 'hand') {
    camera.setPosition(new BABYLON.Vector3(0.5, 0.5, -1.25));
    camera.setTarget(new BABYLON.Vector3(0.5, 0.5, 0));
    light.position = new BABYLON.Vector3(1.0, 5.0, 1.0);
    light.direction = new BABYLON.Vector3(2.5, -4.0, 2.0);
  } else if (target === 'body') {
    camera.setPosition(new BABYLON.Vector3(0.5, 0.75, -1.5));
    camera.setTarget(new BABYLON.Vector3(0.5, 0.5, 0));
    light.position = new BABYLON.Vector3(0.0, 5.0, 5.0);
    light.direction = new BABYLON.Vector3(-0.5, 0.5, -1);
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
    window.path[desc] = path;
    if (path.length < 2) { // body part had no info in this frame so we need to delete it or it presents as ghost
      scene.meshes.find((mesh) => mesh.name === desc)?.dispose();
      if (handTubes[desc]) handTubes[desc].dispose();
      delete handTubes[desc];
    } else if (!handTubes[desc]) { // body part seen for the first time
      handTubes[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene); // create new tube
      handTubes[desc].material = material;
      shadows.addShadowCaster(handTubes[desc], false); // add shadow to new tube
    } else { // updating existing body part
      try {
        handTubes[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE, instance: handTubes[desc] }, scene); // update existing tube
      } catch { // cannot update so cleanup mesh
        console.log('update error:', { desc, path, existing: handTubes[desc] });
        scene.meshes.find((mesh) => mesh.name === desc)?.dispose();
        if (handTubes[desc]) handTubes[desc].dispose();
        delete handTubes[desc];
      }
    }
  }
}

export async function face(result: H.FaceResult) {
  if (!leftEye || !rightEye) {
    leftEye = BABYLON.MeshBuilder.CreateSphere('leftEye', { diameter: 0.1, updatable: true }, scene);
    rightEye = BABYLON.MeshBuilder.CreateSphere('rightEye', { diameter: 0.1, updatable: true }, scene);
    leftEye.material = material;
    rightEye.material = material;
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
  if (result && result.body && result.body[0]) await body(result.body[0], [width, height]);
  if (result && result.hand && result.hand.length > 0) await hand(result.hand[0], [width, height]);
  if (result && result.face && result.face.length > 0) await face(result.face[0]);
}

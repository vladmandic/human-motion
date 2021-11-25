import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here
import * as BABYLON from 'babylonjs';

let engine: BABYLON.Engine;
let scene: BABYLON.Scene;
let camera: BABYLON.ArcRotateCamera;
let shadows: BABYLON.ShadowGenerator;
let material: BABYLON.StandardMaterial;
const tube: Record<string, BABYLON.Mesh> = {};
export interface CustomWindow extends Window {
  engine: BABYLON.Engine,
  scene: BABYLON.Scene,
  camera: BABYLON.Camera,
  meshes: BABYLON.AbstractMesh[],
  path: Record<string, BABYLON.Vector3[]>,
}
declare let window: CustomWindow;

export async function init(canvas: HTMLCanvasElement) {
  console.log('initializing mesh');
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

  // lights
  const lightSphere = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);
  lightSphere.intensity = 0.6;
  lightSphere.specular = BABYLON.Color3.Black();
  const lightPoint = new BABYLON.DirectionalLight('dir01', new BABYLON.Vector3(0, -0.5, -1.0), scene);
  lightPoint.position = new BABYLON.Vector3(0, 5, 5);
  shadows = new BABYLON.ShadowGenerator(1024, lightPoint);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 32;
  // shadowGenerator.addShadowCaster(scene.meshes[0], true);

  // environment with floor
  const environment = scene.createDefaultEnvironment({
    createGround: true,
    enableGroundShadow: true,
    groundColor: BABYLON.Color3.Black(),
  }) as BABYLON.EnvironmentHelper;
  environment.setMainColor(BABYLON.Color3.Gray());

  material = new BABYLON.StandardMaterial('tube', scene);
  material.diffuseColor = new BABYLON.Color3(0, 0.85, 1.0);

  // rendering loop
  engine.runRenderLoop(() => scene.render());

  // expose on global object for diagnostics
  window.engine = engine;
  window.scene = scene;
  window.camera = camera;
  window.meshes = scene.meshes;
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
    window.path[desc] = path;
    if (path.length < 2) { // body part had no info in this frame so we need to delete it or it presents as ghost
      scene.meshes.find((mesh) => mesh.name === desc)?.dispose();
      if (tube[desc]) tube[desc].dispose();
      delete tube[desc];
    } else if (!tube[desc]) { // body part seen for the first time
      tube[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene); // create new tube
      tube[desc].material = material;
      shadows.addShadowCaster(tube[desc], false); // add shadow to new tube
    } else { // updating existing body part
      try {
        tube[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE, instance: tube[desc] }, scene); // update existing tube
      } catch { // cannot update so cleanup mesh
        console.log('update error:', { desc, path, existing: tube[desc] });
        scene.meshes.find((mesh) => mesh.name === desc)?.dispose();
        if (tube[desc]) tube[desc].dispose();
        delete tube[desc];
      }
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
    window.path[desc] = path;
    if (path.length < 2) { // body part had no info in this frame so we need to delete it or it presents as ghost
      scene.meshes.find((mesh) => mesh.name === desc)?.dispose();
      if (tube[desc]) tube[desc].dispose();
      delete tube[desc];
    } else if (!tube[desc]) { // body part seen for the first time
      tube[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene); // create new tube
      tube[desc].material = material;
      shadows.addShadowCaster(tube[desc], false); // add shadow to new tube
    } else { // updating existing body part
      try {
        tube[desc] = BABYLON.MeshBuilder.CreateTube(desc, { path, radius: 0.015, updatable: true, cap: 3, sideOrientation: BABYLON.Mesh.DOUBLESIDE, instance: tube[desc] }, scene); // update existing tube
      } catch { // cannot update so cleanup mesh
        console.log('update error:', { desc, path, existing: tube[desc] });
        scene.meshes.find((mesh) => mesh.name === desc)?.dispose();
        if (tube[desc]) tube[desc].dispose();
        delete tube[desc];
      }
    }
  }
}

export async function draw(canvas: HTMLCanvasElement, width: number, height: number, result: H.Result) {
  if (!scene) await init(canvas);
  if (result && result.body && result.body[0]) await body(result.body[0], [width, height]);
  if (result && result.hand && result.hand.length > 0) await hand(result.hand[0], [width, height]);
}

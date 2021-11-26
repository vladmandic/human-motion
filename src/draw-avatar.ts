import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here
import * as BABYLON from 'babylonjs';
// import * as coords from './coords';

// const modelUrl = '../assets/skull.babylon';
const modelUrl = '../assets/ybot.babylon'; // skull.babylon
let engine: BABYLON.Engine;
let scene: BABYLON.Scene;
let camera: BABYLON.ArcRotateCamera;

export async function init(canvas: HTMLCanvasElement) {
  console.log('initializing avatar');
  // engine and scene
  engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false });
  engine.enableOfflineSupport = false;
  BABYLON.Animation.AllowMatricesInterpolation = true;
  scene = new BABYLON.Scene(engine);

  // camera
  camera = new BABYLON.ArcRotateCamera('camera1', Math.PI / 2, Math.PI / 4, 3, new BABYLON.Vector3(0, 1, 0), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 0.1;
  camera.upperRadiusLimit = 500;
  camera.wheelDeltaPercentage = 0.01;

  // lights
  const lightSphere = new BABYLON.HemisphericLight('lightsphere', new BABYLON.Vector3(0, 1, 0), scene);
  lightSphere.intensity = 0.6;
  lightSphere.specular = BABYLON.Color3.Black();
  const lightPoint = new BABYLON.DirectionalLight('lightpoint', new BABYLON.Vector3(0, -0.5, -1.0), scene);
  lightPoint.position = new BABYLON.Vector3(0, 5, 5);
  const shadowGenerator = new BABYLON.ShadowGenerator(1024, lightPoint);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 32;

  // expose on global object for diagnostics
  /*
  window.engine = engine;
  window.scene = scene;
  window.camera = camera;
  window.meshes = scene.meshes;
  */

  if (modelUrl.includes('skull')) {
    camera.setPosition(new BABYLON.Vector3(0, 10, -50));
    camera.setTarget(new BABYLON.Vector3(0, 5, 0));
    lightPoint.direction = new BABYLON.Vector3(-1, -1, 0);
  }
  if (modelUrl.includes('ybot')) {
    camera.setPosition(new BABYLON.Vector3(-1, 1, 3));
    camera.setTarget(new BABYLON.Vector3(0, 1, 0));
    lightPoint.direction = new BABYLON.Vector3(-1, -1, -1);
  }

  // load model
  return new Promise((resolve) => {
    BABYLON.SceneLoader.ImportMesh('', '', modelUrl, scene, (meshes, _particles, skeletons) => {
      console.log('loaded avatar');
      if (skeletons && skeletons.length > 0) skeletons[0].bones.forEach((bone) => { bone.name = bone.name.replace('mixamorig:', ''); }); // remap names from ybot
      shadowGenerator.addShadowCaster(scene.meshes[0], true);
      for (let index = 0; index < meshes.length; index++) meshes[index].receiveShadows = false;
      const helper = scene.createDefaultEnvironment({ enableGroundShadow: true }) as BABYLON.EnvironmentHelper;
      helper.setMainColor(BABYLON.Color3.Gray());
      (helper.ground as BABYLON.Mesh).position.y += 0.01;
      engine.runRenderLoop(() => scene.render());
      resolve(scene);
    });
  });
}

export async function draw(canvasOutput: HTMLCanvasElement, result: H.Result) {
  if (!scene) await init(canvasOutput);
  if (result) {
    // tbd
  }
}

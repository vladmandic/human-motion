import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here
import * as BABYLON from 'babylonjs';
// import * as coords from './coords';

const modelUrl = '../assets/ybot.babylon';
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
  camera.lowerRadiusLimit = 2;
  camera.upperRadiusLimit = 10;
  camera.wheelDeltaPercentage = 0.01;

  // lights
  const lightSphere = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);
  lightSphere.intensity = 0.6;
  lightSphere.specular = BABYLON.Color3.Black();
  const lightPoint = new BABYLON.DirectionalLight('dir01', new BABYLON.Vector3(0, -0.5, -1.0), scene);
  lightPoint.position = new BABYLON.Vector3(0, 5, 5);
  const shadowGenerator = new BABYLON.ShadowGenerator(1024, lightPoint);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 32;

  // load model
  return new Promise((resolve) => {
    BABYLON.SceneLoader.ImportMesh('', '', modelUrl, scene, (newMeshes, _particleSystems, skeletons) => {
      console.log('loaded avatar');
      const skeleton = skeletons[0];
      skeleton.bones.forEach((bone) => { bone.name = bone.name.replace('mixamorig:', ''); });
      shadowGenerator.addShadowCaster(scene.meshes[0], true);
      for (let index = 0; index < newMeshes.length; index++) newMeshes[index].receiveShadows = false;
      const helper = scene.createDefaultEnvironment({ enableGroundShadow: true }) as BABYLON.EnvironmentHelper;
      helper.setMainColor(BABYLON.Color3.Gray());
      (helper.ground as BABYLON.Mesh).position.y += 0.01;
      skeleton.animationPropertiesOverride = new BABYLON.AnimationPropertiesOverride();
      skeleton.animationPropertiesOverride.enableBlending = true;
      skeleton.animationPropertiesOverride.blendingSpeed = 0.05;
      skeleton.animationPropertiesOverride.loopMode = 1;
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

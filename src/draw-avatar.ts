import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here
import * as BABYLON from 'babylonjs';
import type { CustomWindow } from './globals';
import * as coords from './coords';

// const modelUrl = '../assets/skull.babylon';
const modelUrl = '../assets/ybot.babylon'; // skull.babylon
let engine: BABYLON.Engine;
let scene: BABYLON.Scene;
let camera: BABYLON.ArcRotateCamera;
let skeleton: BABYLON.Skeleton;
declare let window: CustomWindow;

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
      if (skeletons && skeletons.length > 0) {
        skeleton = skeletons[0];
        skeleton.name = 'ybot';
        skeleton.bones.forEach((bone) => { bone.name = bone.name.replace('mixamorig:', ''); }); // remap names from ybot
        skeleton.returnToRest();
        window.skeleton = skeleton;
      }
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

type Point = [number, number, number];
const getBone = (name: string): (BABYLON.Bone | undefined) => skeleton.bones.find((bone) => bone.name === name) as BABYLON.Bone;
const getPart = (body: H.BodyResult, name: string): (Point | undefined) => body.keypoints.find((kpt) => kpt.part === name)?.positionRaw as Point;

const rad = (d0: number, d1: number): number => Math.atan2(d0, d1);

const angle = (pt0: Point, pt1: Point) => ({
  pitch: rad(pt0[0] - pt1[0], pt0[1] - pt1[1]),
  roll: rad(pt0[1] - pt1[1], (pt0[2] - pt1[2]) / 256),
  yaw: rad((pt0[2] - pt1[2]) / 256, pt0[0] - pt1[0]),
});

export async function draw(canvasOutput: HTMLCanvasElement, result: H.Result) {
  if (!scene) await init(canvasOutput);
  if (result && result.body && result.body[0]) {
    // tbd
    const body = result.body[0];
    for (const pair of coords.pairs) {
      const pt0 = getPart(body, pair[0]);
      const pt1 = getPart(body, pair[1]);
      const bone = getBone(pair[2]);
      if (!pt0 || !pt1 || !bone) continue;
      const a = angle(pt0, pt1);
      console.log({ pair, pt0, pt1, bone, a });
      // bone.setYawPitchRoll(a.yaw, a.pitch, a.roll);
      bone.setYawPitchRoll(a.yaw, a.pitch, a.roll);
      window.bone = bone;
    }
  }
}

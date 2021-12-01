import type * as H from '@vladmandic/human'; // just import typedefs as we dont need human here
import * as BABYLON from 'babylonjs';
import * as coords from './coords';
import * as environment from './environment';

// const modelUrl = '../assets/skull.babylon';
const modelUrl = '../assets/ybot.babylon'; // skull.babylon
let t: environment.Scene;

export async function position() {
  if (modelUrl.includes('skull')) {
    t.camera.setPosition(new BABYLON.Vector3(0, 10, -50));
    t.camera.setTarget(new BABYLON.Vector3(0, 5, 0));
    t.light.direction = new BABYLON.Vector3(-1, -1, 0);
  }
  if (modelUrl.includes('ybot')) {
    t.camera.setPosition(new BABYLON.Vector3(-1, 1, 3));
    t.camera.setTarget(new BABYLON.Vector3(0, 1, 0));
    t.light.direction = new BABYLON.Vector3(-1, -1, -1);
  }
}

export async function init(canvasOutput: HTMLCanvasElement) {
  return new Promise((resolve) => {
    if (!t) t = new environment.Scene(canvasOutput);
    // load model
    BABYLON.SceneLoader.ImportMesh('', '', modelUrl, t.scene as BABYLON.Scene, (meshes, _particles, skeletons) => {
      if (skeletons && skeletons.length > 0) {
        t.skeleton = skeletons[0];
        t.skeleton.name = 'ybot';
        t.skeleton.bones.forEach((bone) => { bone.name = bone.name.replace('mixamorig:', ''); }); // remap names from ybot
        t.skeleton.returnToRest();
      }
      t.shadows.addShadowCaster(t.scene.meshes[0], true);
      for (let index = 0; index < meshes.length; index++) meshes[index].receiveShadows = false;
      t.defaults(); // augment scene with default environment
      position();
      resolve(true);
    });
  });
}

type Point = [number, number, number];
const getBone = (name: string): (BABYLON.Bone | undefined) => t?.skeleton?.bones.find((bone) => bone.name === name) as BABYLON.Bone;
const getPart = (body: H.BodyResult, name: string): (Point | undefined) => body.keypoints.find((kpt) => kpt.part === name)?.positionRaw as Point;

const rad = (d0: number, d1: number): number => Math.atan2(d0, d1);

const angle = (pt0: Point, pt1: Point) => ({
  pitch: rad(pt0[0] - pt1[0], pt0[1] - pt1[1]),
  roll: rad(pt0[1] - pt1[1], (pt0[2] - pt1[2]) / 256),
  yaw: rad((pt0[2] - pt1[2]) / 256, pt0[0] - pt1[0]),
});

export async function draw(result: H.Result) {
  if (!t) return;
  if (result && result.body && result.body[0]) {
    // tbd
    const body = result.body[0];
    for (const pair of coords.pairs) {
      const pt0 = getPart(body, pair[0]);
      const pt1 = getPart(body, pair[1]);
      const bone = getBone(pair[2]);
      if (!pt0 || !pt1 || !bone) continue;
      const a = angle(pt0, pt1);
      // bone.setYawPitchRoll(a.yaw, a.pitch, a.roll);
      bone.setYawPitchRoll(a.yaw, a.pitch, a.roll);
    }
  }
}

/*
- [Kpt to Bone](https://github.com/aha-001/react-tfjs-models/blob/main/src/components/Mousy.js)
*/

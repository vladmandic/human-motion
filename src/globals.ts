import type * as BABYLON from 'babylonjs';

export interface CustomWindow extends Window {
  engine: BABYLON.Engine,
  scene: BABYLON.Scene,
  camera: BABYLON.Camera,
  light: BABYLON.DirectionalLight,
  meshes: BABYLON.AbstractMesh[],
  shadows: BABYLON.ShadowGenerator,
  path: Record<string, BABYLON.Vector3[]>,
  skeleton: BABYLON.Skeleton,
  bone: BABYLON.Bone,
}

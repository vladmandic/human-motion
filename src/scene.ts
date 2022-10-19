// import { Engine, Scene, ArcRotateCamera, Skeleton, ShadowGenerator, SpotLight, DirectionalLight, HighlightLayer, Nullable, HemisphericLight, EnvironmentHelper, Color3, BackEase, CircleEase } from '@babylonjs/core';
import { Engine } from '@babylonjs/core/Engines';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras';
import { ShadowGenerator, SpotLight, DirectionalLight, HemisphericLight } from '@babylonjs/core/Lights';
import { HighlightLayer } from '@babylonjs/core/Layers';
import { Animation, CircleEase, BackEase } from '@babylonjs/core/Animations';
import { Vector3, Color3 } from '@babylonjs/core/Maths';
import { PBRCustomMaterial } from '@babylonjs/materials';
import type { Skeleton } from '@babylonjs/core/Bones';
import type { Mesh } from '@babylonjs/core/Meshes';
import type { EnvironmentHelper } from '@babylonjs/core/Helpers';
import type { Nullable } from '@babylonjs/core';

export class MyScene {
  engine!: Engine;
  canvas!: HTMLCanvasElement;
  scene!: Scene;
  materialBone!: PBRCustomMaterial;
  materialJoint!: PBRCustomMaterial;
  materialHead!: PBRCustomMaterial;
  camera!: ArcRotateCamera;
  light!: DirectionalLight;
  spotlight!: SpotLight;
  ambient!: HemisphericLight;
  shadows!: ShadowGenerator;
  environment!: EnvironmentHelper;
  skybox: Mesh | undefined;
  ground: Mesh | undefined;
  skeleton?: Skeleton | undefined;
  highlight: HighlightLayer;
  currentMesh: Nullable<Mesh> = null;
  hoverMesh: Nullable<Mesh> = null;
  pointerPosition: Nullable<Vector3> = null;
  initialized = false;

  constructor(outputCanvas: HTMLCanvasElement, cameraRadius: number, introDurationMs: number) {
    this.canvas = outputCanvas;
    // engine & scene
    this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false, doNotHandleContextLost: true });
    this.engine.enableOfflineSupport = false;
    Animation.AllowMatricesInterpolation = true;
    this.scene = new Scene(this.engine);
    this.scene.clearCachedVertexData();

    this.materialHead = new PBRCustomMaterial('head', this.scene);
    this.materialHead.metallic = 1.0;
    this.materialHead.roughness = 0.65;
    this.materialHead.alpha = 1.0;
    this.materialHead.albedoColor = Color3.FromHexString('#91ECFF');
    this.materialHead.iridescence.isEnabled = true;
    this.materialHead.backFaceCulling = false;

    this.materialBone = new PBRCustomMaterial('bone', this.scene);
    this.materialBone.metallic = 1.0;
    this.materialBone.roughness = 0.4;
    this.materialBone.alpha = 1.0;
    this.materialBone.albedoColor = Color3.FromHexString('#B1ECFF');
    this.materialBone.iridescence.isEnabled = true;

    this.materialJoint = new PBRCustomMaterial('joint', this.scene);
    this.materialJoint.metallic = 1.0;
    this.materialJoint.roughness = 0.0;
    this.materialJoint.alpha = 0.5;
    this.materialJoint.albedoColor = Color3.FromHexString('#FFFFFF');
    this.materialJoint.iridescence.isEnabled = true;

    this.highlight = new HighlightLayer('highlight', this.scene);
    // start scene
    this.engine.runRenderLoop(() => this.scene.render());
    // camera
    if (this.camera) this.camera.dispose();
    this.camera = new ArcRotateCamera('camera', 0, 0, cameraRadius, new Vector3(0.5, 0.5, 0.5), this.scene);
    this.camera.attachControl(this.canvas, false);
    this.camera.lowerRadiusLimit = 0.001;
    this.camera.upperRadiusLimit = 200;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.position = new Vector3(0, 2.0, -12);
    this.camera.target = new Vector3(0, 0.5, -1); // slightly elevated initial view
    this.camera.alpha = (2 * Math.PI + this.camera.alpha) % (2 * Math.PI); // normalize so its not in negative range
    // environment
    if (this.environment) this.environment.dispose();
    this.environment = this.scene.createDefaultEnvironment({
      environmentTexture: '../assets/scene-environment.env',
      createSkybox: true,
      skyboxTexture: '../assets/scene-skybox.dds',
      skyboxColor: new Color3(0.0, 0.0, 0.0),
      skyboxSize: 100,
      createGround: true,
      groundColor: new Color3(1.0, 1.0, 1.0),
      groundSize: 10,
      groundShadowLevel: 0.1,
      groundTexture: '../assets/scene-ground.png',
      enableGroundShadow: true,
    }) as EnvironmentHelper;
    // lights
    if (this.ambient) this.ambient.dispose();
    this.ambient = new HemisphericLight('spheric', new Vector3(0, 1, 0), this.scene);
    this.ambient.intensity = 0.5;
    this.ambient.specular = Color3.Black();
    if (this.light) this.light.dispose();
    this.light = new DirectionalLight('directional', new Vector3(0.3, -0.5, 1), this.scene);
    this.light.position = new Vector3(2.5, 5, -5);
    if (this.shadows) this.shadows.dispose();
    this.shadows = new ShadowGenerator(1024, this.light);
    this.shadows.useBlurExponentialShadowMap = true;
    this.shadows.blurKernel = 8;
    this.shadows.depthScale = 60.0;
    // animate
    if (introDurationMs > 0) this.intro(introDurationMs);
    // @ts-ignore
    window.t = this;
    // this.scene.debugLayer.show();
  }

  intro(ms: number) {
    Animation.CreateAndStartAnimation('camera', this.camera, 'fov', 60, 60 * ms / 500, /* start */ 1.0, /* end */ 0.1, /* loop */ 0, new BackEase());
    Animation.CreateAndStartAnimation('light', this.light, 'direction.x', 60, 60 * ms / 500, /* start */ -0.6, /* end */ 0.3, /* loop */ 0, new CircleEase());
    Animation.CreateAndStartAnimation('light', this.light, 'direction.y', 60, 60 * ms / 500, /* start */ -0.1, /* end */ -0.5, /* loop */ 0, new CircleEase());
  }
}

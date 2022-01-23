import * as BABYLON from 'babylonjs';

export class Scene {
  engine!: BABYLON.Engine;
  canvas!: HTMLCanvasElement;
  scene!: BABYLON.Scene;
  materialBone!: BABYLON.StandardMaterial;
  materialJoint!: BABYLON.StandardMaterial;
  materialHead!: BABYLON.StandardMaterial;
  camera!: BABYLON.ArcRotateCamera;
  light!: BABYLON.DirectionalLight;
  spotlight!: BABYLON.SpotLight;
  ambient!: BABYLON.HemisphericLight;
  shadows!: BABYLON.ShadowGenerator;
  environment!: BABYLON.EnvironmentHelper;
  skybox: BABYLON.Mesh | undefined;
  ground: BABYLON.Mesh | undefined;
  skeleton?: BABYLON.Skeleton | undefined;
  highlight: BABYLON.HighlightLayer;
  currentMesh: BABYLON.Nullable<BABYLON.Mesh> = null;
  hoverMesh: BABYLON.Nullable<BABYLON.Mesh> = null;
  pointerPosition: BABYLON.Nullable<BABYLON.Vector3> = null;
  initialized = false;

  constructor(outputCanvas: HTMLCanvasElement, cameraRadius: number, introDurationMs: number) {
    this.canvas = outputCanvas;
    // engine & scene
    this.engine = new BABYLON.Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false, doNotHandleContextLost: true });
    this.engine.enableOfflineSupport = false;
    BABYLON.Animation.AllowMatricesInterpolation = true;
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearCachedVertexData();
    this.materialBone = new BABYLON.StandardMaterial('materialTube', this.scene);
    this.materialBone.diffuseColor = new BABYLON.Color3(0.0, 0.6, 0.6);
    this.materialBone.alpha = 1.0;
    this.materialBone.useSpecularOverAlpha = true;
    this.materialJoint = new BABYLON.StandardMaterial('materialTube', this.scene);
    this.materialJoint.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.5);
    this.materialJoint.alpha = 0.6;
    this.materialJoint.useSpecularOverAlpha = true;
    this.materialHead = new BABYLON.StandardMaterial('materialHead', this.scene);
    this.materialHead.diffuseColor = new BABYLON.Color3(0.6, 1.0, 1.0);
    this.materialHead.specularColor = new BABYLON.Color3(0.6, 1.0, 1.0);
    this.materialHead.alpha = 0.7;
    this.materialHead.specularPower = 0;
    this.highlight = new BABYLON.HighlightLayer('highlight', this.scene);
    // start scene
    this.engine.runRenderLoop(() => this.scene.render());
    // camera
    if (this.camera) this.camera.dispose();
    this.camera = new BABYLON.ArcRotateCamera('camera1', 0, 0, cameraRadius, new BABYLON.Vector3(0.5, 0.5, 0.5), this.scene);
    this.camera.attachControl(this.canvas, false);
    this.camera.lowerRadiusLimit = 0.001;
    this.camera.upperRadiusLimit = 200;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.position = new BABYLON.Vector3(0, 2.0, -12);
    this.camera.target = new BABYLON.Vector3(0, 0.5, -1); // slightly elevated initial view
    this.camera.alpha = (2 * Math.PI + this.camera.alpha) % (2 * Math.PI); // normalize so its not in negative range
    // environment
    if (this.environment) this.environment.dispose();
    this.environment = this.scene.createDefaultEnvironment({
      environmentTexture: '../assets/scene-environment.env',
      createSkybox: true,
      skyboxTexture: '../assets/scene-skybox.dds',
      skyboxColor: new BABYLON.Color3(0.0, 0.0, 0.0),
      skyboxSize: 100,
      createGround: true,
      groundColor: new BABYLON.Color3(1.0, 1.0, 1.0),
      groundSize: 10,
      groundShadowLevel: 0.1,
      groundTexture: '../assets/scene-ground.png',
      enableGroundShadow: true,
    }) as BABYLON.EnvironmentHelper;
    // lights
    if (this.ambient) this.ambient.dispose();
    this.ambient = new BABYLON.HemisphericLight('spheric', new BABYLON.Vector3(0, 1, 0), this.scene);
    this.ambient.intensity = 0.5;
    this.ambient.specular = BABYLON.Color3.Black();
    if (this.light) this.light.dispose();
    this.light = new BABYLON.DirectionalLight('directional', new BABYLON.Vector3(0.3, -0.5, 1), this.scene);
    this.light.position = new BABYLON.Vector3(2.5, 5, -5);
    if (this.shadows) this.shadows.dispose();
    this.shadows = new BABYLON.ShadowGenerator(1024, this.light);
    this.shadows.useBlurExponentialShadowMap = true;
    this.shadows.blurKernel = 8;
    this.shadows.depthScale = 60.0;
    // animate
    if (introDurationMs > 0) this.intro(introDurationMs);
    // @ts-ignore
    window.t = this;
  }

  intro(ms: number) {
    BABYLON.Animation.CreateAndStartAnimation('camera', this.camera, 'fov', 60, 60 * ms / 500, /* start */ 1.0, /* end */ 0.1, /* loop */ 0, new BABYLON.BackEase());
    BABYLON.Animation.CreateAndStartAnimation('light', this.light, 'direction.x', 60, 60 * ms / 500, /* start */ -0.6, /* end */ 0.3, /* loop */ 0, new BABYLON.CircleEase());
    BABYLON.Animation.CreateAndStartAnimation('light', this.light, 'direction.y', 60, 60 * ms / 500, /* start */ -0.1, /* end */ -0.5, /* loop */ 0, new BABYLON.CircleEase());
  }
}

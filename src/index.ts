import * as H from '@vladmandic/human';
import * as BABYLON from '@babylonjs/core';
import * as overlay from './overlay';
import * as mesh from './mesh';

const width = 512;
const height = 512;

const config: Partial<H.Config> = {
  backend: 'humangl' as const,
  modelBasePath: '../assets',
  cacheSensitivity: 0,
  filter: { enabled: true, equalization: false, width, height },
  face: { enabled: false, detector: { rotation: false }, mesh: { enabled: true }, attention: { enabled: true }, iris: { enabled: true }, description: { enabled: false }, emotion: { enabled: false } },
  body: { enabled: false, minConfidence: 0.1, maxDetected: 1, modelPath: 'blazepose-heavy.json' },
  hand: { enabled: false, minConfidence: 0.1, maxDetected: 1, landmarks: true, rotation: false },
  object: { enabled: false },
  gesture: { enabled: false },
};
const videos = ['[sample video]', '../assets/FaceModel.mp4', '../assets/BaseballPitch.mp4', '../assets/ASLSignAlphabet.mp4'];
const human = new H.Human(config); // local instance of human used only to prepare input and interpolate results
const worker = new Worker('../dist/worker.js'); // processing is done inside web worker
let result: H.Result; // last known good result from human.detect
let drawTimestamp = 0; // used to calculate fps
let tensors = 0; // monitors tensor counts inside web worker
let busy = false; // busy flag set when posted message to worker and cleared when received message from worker
let totalTime = 0;
let totalCount = 0;

const dom = { // pointers to dom objects
  input: document.getElementById('input') as HTMLVideoElement,
  file: document.getElementById('file-input') as HTMLInputElement,
  status: document.getElementById('status') as HTMLPreElement,
  log: document.getElementById('log') as HTMLPreElement,
  outputOverlay: document.getElementById('output-overlay') as HTMLCanvasElement,
  outputMesh: document.getElementById('output-mesh') as HTMLCanvasElement,
  face: document.getElementById('face') as HTMLInputElement,
  body: document.getElementById('body') as HTMLInputElement,
  hand: document.getElementById('hand') as HTMLInputElement,
  selectInput: document.getElementById('select-input') as HTMLSelectElement,
  webcam: document.getElementById('webcam') as HTMLButtonElement,
  faceCanvas: document.createElement('canvas'),
};

const log = (...msg: unknown[]) => {
  dom.log.innerText += msg.join(' ') + '\n';
  console.log(...msg);
};

// draw loop runs at fixed 60 fps
async function drawResults() {
  if (result) {
    const now = Date.now();
    const age = now - result.timestamp;
    if (age > 500) { // let it run for just a bit longer so interpolation caches up
      dom.status.innerText = 'paused';
    } else {
      totalTime += age;
      totalCount += 1;
      dom.status.innerText = `process${(1000 / age).toFixed(1).padStart(5)} | refresh${(1000 / (now - drawTimestamp)).toFixed(1).padStart(5)} | avg${(1000 * totalCount / totalTime).toFixed(1).padStart(5)}`;
      drawTimestamp = now;
      const interpolated = await human.next(result); // interpolate results
      await overlay.draw(width, height, interpolated, dom.input);
      await mesh.draw(width, height, interpolated);
    }
  }
  requestAnimationFrame(() => drawResults());
}

// detect loop runs as fast as results are received
async function requestDetect() {
  if (busy || dom.input.readyState < 2) return; // already processing or video not ready
  const processed = await human.image(dom.input); // process input in main thread
  const image = await processed.tensor?.data() as Float32Array; // download data to use as transferrable object
  human.tf.dispose(processed.tensor);
  if (image) {
    busy = true;
    worker.postMessage({ image, width, height, config }, [image.buffer]); // immediately request next frame
  }
}

// receive message from worker thread
async function receiveMessage(msg: MessageEvent) {
  busy = false;
  if (msg?.data?.state) {
    const state = JSON.parse(msg?.data?.state);
    if (state.numTensors > (tensors + 10)) log(`state: tensors: ${state.numTensors.toLocaleString()} | bytes: ${state.numBytes.toLocaleString()} | ${human.env.webgl.version?.toLowerCase()}`);
    tensors = state.numTensors;
  }
  if (msg?.data?.result) result = msg.data.result as H.Result;
  if (!dom.input.paused) await requestDetect(); // if not paused request next frame
}

const resize = () => {
  dom.input.width = dom.input.videoWidth;
  dom.input.height = dom.input.videoHeight;
  dom.outputOverlay.width = dom.input.videoWidth;
  dom.outputOverlay.height = dom.input.videoHeight;
  dom.outputMesh.width = dom.input.videoWidth;
  dom.outputMesh.height = dom.input.videoHeight;
};

// load video from url
async function loadVideo(url: string, title?: string) {
  dom.status.innerText = 'loading video...';
  return new Promise((resolve, reject) => {
    dom.input.onerror = (err) => {
      dom.status.innerText = 'video error';
      log(`error loading: ${title || url} | ${dom.input.error?.message.toLowerCase()}`);
      reject(err);
    };
    dom.input.onloadeddata = () => {
      dom.input.controls = true;
      dom.input.playbackRate = 1.0;
      dom.status.innerText = '';
      resize();
      log(`video: ${title || url} resolution: ${dom.input.videoWidth} x ${dom.input.videoHeight} duration: ${Math.trunc(dom.input.duration)}`);
      resolve(true);
    };
    dom.input.onplay = () => requestDetect();
    dom.input.onseeked = () => requestDetect();
    if (dom.input.srcObject) dom.input.srcObject = null;
    dom.input.src = url;
  });
}

// initialize webcam and set video to use webcam as source
async function startWebCam() {
  const constraints = { audio: false, video: { facingMode: 'user', resizeMode: 'crop-and-scale', width: { ideal: 1280 }, height: { ideal: 1280 } } };
  const stream: MediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  const ready = new Promise((resolve) => { dom.input.onloadeddata = () => resolve(true); });
  if (dom.input.src) dom.input.src = '';
  dom.input.srcObject = stream;
  dom.input.play();
  await ready;
  resize();
  const track: MediaStreamTrack = stream.getVideoTracks()[0];
  log('webcam:', dom.input.videoWidth, dom.input.videoHeight, track.label);
  dom.input.onclick = () => { // pause when clicked on screen and resume on next click
    if (dom.input.paused) {
      dom.input.play();
      requestDetect();
    } else {
      dom.input.pause();
    }
  };
  requestDetect();
}

// enable or disable a human model
const enableModels = (face: boolean, body: boolean, hand: boolean) => { // event that selects active model
  mesh.init(dom.outputMesh, human.faceTriangulation, human.faceUVMap);
  if (config.face) config.face.enabled = face;
  if (config.body) config.body.enabled = body;
  if (config.hand) config.hand.enabled = hand;
  const models = [];
  if (face) models.push(human.config.face.detector?.modelPath, human.config.face.mesh?.modelPath);
  if (body) models.push(human.config.body.modelPath);
  if (hand) models.push(human.config.hand.detector?.modelPath, human.config.hand.skeleton?.modelPath);
  log(`enabled models: ${models.join(' | ')}`);
};

// global initializer
async function init() {
  for (const video of videos) { // enumerate video samples
    const input = document.createElement('option');
    input.value = video;
    input.innerText = video;
    dom.selectInput.appendChild(input);
  }
  dom.selectInput.onchange = (ev: Event) => { // event when video is selected
    const opt = (ev.target as HTMLSelectElement).options as HTMLOptionsCollection;
    if (opt.selectedIndex > 0) loadVideo(opt[opt.selectedIndex].value);
  };
  dom.file.onchange = (ev: Event) => { // event when loading video from file
    ev.preventDefault();
    if (!dom.file.files || !dom.file.files[0]) return;
    const file = dom.file.files[0];
    const reader = new FileReader();
    reader.onload = (read) => {
      if (read.target && read.target.result) loadVideo(read.target.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };
  dom.webcam.onclick = () => startWebCam(); // event to use webcam as video input
  dom.face.onchange = () => enableModels(dom.face.checked, dom.body.checked, dom.hand.checked);
  dom.body.onchange = () => enableModels(dom.face.checked, dom.body.checked, dom.hand.checked);
  dom.hand.onchange = () => enableModels(dom.face.checked, dom.body.checked, dom.hand.checked);
}

async function main() {
  dom.status.innerText = 'loading...';
  await human.validate(config); // check for possible configuration errors
  await human.init(); // requires explicit init since were not using any of the auto functions
  log('human', human.version, '| tfjs', human.tf.version.tfjs, '| babylon', BABYLON.Engine.Version, '|', human.env.webgl.version?.toLowerCase());
  await init();
  // init modules each in its own canvas
  await overlay.init(dom.outputOverlay, human.faceTriangulation);
  await mesh.init(dom.outputMesh, human.faceTriangulation, human.faceUVMap);
  dom.status.innerText = 'ready...';
  worker.onmessage = receiveMessage; // listen to messages from worker thread
  worker.postMessage({ config }); // send initial message to worker thread so it can initialize
  drawResults();
  enableModels(dom.face.checked, dom.body.checked, dom.hand.checked);
  startWebCam();
}

window.onload = main;

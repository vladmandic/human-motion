import * as H from '@vladmandic/human';
import * as overlay from './draw-overlay';
import * as mesh from './draw-mesh';
import * as avatar from './draw-avatar';

const width = 512;
const height = 512;

const config: Partial<H.Config> = {
  backend: 'humangl' as const, // try webgpu first with fallback to humangl
  modelBasePath: '../assets',
  cacheSensitivity: 0,
  filter: { enabled: true, equalization: true, width, height },
  face: { enabled: false, detector: { rotation: false }, mesh: { enabled: true }, iris: { enabled: true }, description: { enabled: false }, emotion: { enabled: false } },
  body: { enabled: false, minConfidence: 0.1, maxDetected: 1, modelPath: 'blazepose-heavy.json' },
  hand: { enabled: false, minConfidence: 0.1, maxDetected: 1, landmarks: true, rotation: false },
  object: { enabled: false },
  gesture: { enabled: false },
};

const videos = ['', '../assets/BaseballPitch.mp4', '../assets/FaceModel.mp4', '../assets/ASLSignAlphabet.mp4', '../assets/ContemporaryDance.mp4', '../assets/FloorGymnast.mp4'];
const human = new H.Human(config);
const worker = new Worker('../dist/worker.js');

const dom = {
  input: document.getElementById('input') as HTMLVideoElement,
  file: document.getElementById('file-input') as HTMLInputElement,
  status: document.getElementById('status') as HTMLPreElement,
  log: document.getElementById('log') as HTMLPreElement,
  interpolate: document.getElementById('interpolate') as HTMLInputElement,
  outputOverlay: document.getElementById('output-overlay') as HTMLCanvasElement,
  outputWireframe: document.getElementById('output-wireframe') as HTMLCanvasElement,
  outputAvatar: document.getElementById('output-avatar') as HTMLCanvasElement,
  face: document.getElementById('face') as HTMLInputElement,
  body: document.getElementById('body') as HTMLInputElement,
  hand: document.getElementById('hand') as HTMLInputElement,
  selectInput: document.getElementById('select-input') as HTMLSelectElement,
  selectOutput: document.getElementById('select-output') as HTMLSelectElement,
  webcam: document.getElementById('webcam') as HTMLButtonElement,
};

const log = (...msg: unknown[]) => {
  dom.log.innerText += msg.join(' ') + '\n';
  console.log(...msg);
};

let result: H.Result; // last known good result
let last = 0;
async function drawResults() {
  if (result) {
    const now = Date.now();
    const age = now - result.timestamp;
    if (age > 1000) { // let it run for 1 sec so interpolation caches up
      dom.status.innerText = 'paused';
    } else {
      dom.status.innerText = `process${(1000 / age).toFixed(1).padStart(5)} | refresh${(1000 / (now - last)).toFixed(1).padStart(5)}`;
      last = Date.now();
      const interpolated = dom.interpolate.checked ? await human.next(result) : result; // interpolation is optional
      const opt = (document.getElementById('select-output') as HTMLSelectElement).options;
      if (opt.selectedIndex === 1) await overlay.draw(width, height, interpolated, dom.input);
      else if (opt.selectedIndex === 2) await mesh.draw(width, height, interpolated);
      else if (opt.selectedIndex === 3) await avatar.draw(dom.outputAvatar, interpolated);
      else dom.status.innerText = 'select output';
    }
  }
  requestAnimationFrame(() => drawResults());
}

let busy = false;
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

let tensors = 0;
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
  dom.outputWireframe.width = dom.input.videoWidth;
  dom.outputWireframe.height = dom.input.videoHeight;
  dom.outputAvatar.width = dom.input.videoWidth;
  dom.outputAvatar.height = dom.input.videoHeight;
};

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
    dom.input.src = url;
  });
}

async function webcam() { // initialize webcam
  // @ts-ignore resizeMode is not yet defined in tslib
  const options: MediaStreamConstraints = { audio: false, video: { facingMode: 'user', resizeMode: 'crop-and-scale', width: { ideal: 1280 }, height: { ideal: 1280 } } };
  const stream: MediaStream = await navigator.mediaDevices.getUserMedia(options);
  const ready = new Promise((resolve) => { dom.input.onloadeddata = () => resolve(true); });
  dom.input.srcObject = stream;
  dom.input.play();
  await ready;
  resize();
  const track: MediaStreamTrack = stream.getVideoTracks()[0];
  const capabilities: MediaTrackCapabilities | string = track.getCapabilities ? track.getCapabilities() : '';
  const settings: MediaTrackSettings | string = track.getSettings ? track.getSettings() : '';
  const constraints: MediaTrackConstraints | string = track.getConstraints ? track.getConstraints() : '';
  log('webcam:', dom.input.videoWidth, dom.input.videoHeight, track.label);
  console.log({ stream, track, settings, constraints, capabilities });
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

async function init() {
  for (const video of videos) {
    // const res = await fetch(video); // check if video exists
    // if (!res.ok) continue; // video not found
    const input = document.createElement('option');
    input.value = video;
    input.innerText = video;
    dom.selectInput.appendChild(input);
  }
  dom.selectInput.onchange = (ev: Event) => {
    const opt = (ev.target as HTMLSelectElement).options as HTMLOptionsCollection;
    if (opt[opt.selectedIndex].value && opt[opt.selectedIndex].value.length > 0) loadVideo(opt[opt.selectedIndex].value);
  };
  dom.selectOutput.onchange = (ev: Event) => {
    const selected = (ev.target as HTMLSelectElement).options.selectedIndex;
    dom.outputOverlay.style.display = selected === 1 ? 'block' : 'none';
    dom.outputWireframe.style.display = selected === 2 ? 'block' : 'none';
    dom.outputAvatar.style.display = selected === 3 ? 'block' : 'none';
  };
  dom.file.onchange = (ev: Event) => {
    ev.preventDefault();
    console.log(dom.file.files);
    if (!dom.file.files || !dom.file.files[0]) return;
    const file = dom.file.files[0];
    const reader = new FileReader();
    reader.onload = (read) => {
      if (read.target && read.target.result) loadVideo(read.target.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };
  dom.webcam.onclick = () => webcam();
  const enabled = (face: boolean, body: boolean, hand: boolean) => {
    if (config.face) config.face.enabled = face;
    if (config.body) config.body.enabled = body;
    if (config.hand) config.hand.enabled = hand;
    log(`selected model: ${face ? human.config.face.mesh?.modelPath : ''}${body ? human.config.body.modelPath : ''}${hand ? human.config.hand.detector?.modelPath : ''}`);
    if (face) mesh.position('face');
    if (body) mesh.position('body');
    if (hand) mesh.position('hand');
  };
  dom.face.onchange = () => enabled(dom.face.checked, dom.body.checked, dom.hand.checked);
  dom.body.onchange = () => enabled(dom.face.checked, dom.body.checked, dom.hand.checked);
  dom.hand.onchange = () => enabled(dom.face.checked, dom.body.checked, dom.hand.checked);
}

async function main() {
  log('human', human.version, '| tfjs', human.tf.version.tfjs);
  dom.status.innerText = 'ready...';
  await human.validate(config);
  await human.init(); // requires explicit init since were not using any of the auto functions
  await init();
  await overlay.init(dom.outputOverlay, human.faceTriangulation);
  await mesh.init(dom.outputWireframe, human.faceTriangulation);
  worker.onmessage = receiveMessage; // listen to messages from worker thread
  worker.postMessage({ config }); // send initial message to worker thread so it can initialize
  drawResults();

  /*
  dom.body.click();
  dom.selectInput.selectedIndex = 1;
  loadVideo(dom.selectInput.value);
  dom.selectOutput.selectedIndex = 3;
  dom.outputAvatar.style.display = 'block';
  */
}

window.onload = main;

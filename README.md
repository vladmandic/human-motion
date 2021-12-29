# Human: Motion Analytics Demo

*This project is released as preview and is still in a development phase*

- Input  
  **Video file**  
  **Live webcam**  
- Analyze and track all keypoints in a *web worker* thread  
  Using [**Human**](https://github.com/vladmandic/human) library  
  **Face**, **Body**, **Hands**
- Display  
  **Video Overlay**  
  **3D Mesh** with *pan/zoom/rotate* functionality

<br>

> [**Live Demo**](https://vladmandic.github.io/human-motion/src/index.html)

<br>

![**Screenshot-Face**](assets/screenshot-face.jpg)
![**Screenshot-Body**](assets/screenshot-body.jpg)
![**Screenshot-Hand**](assets/screenshot-hand.jpg)

<br>

## Limitations

- Must use **Chromium** based browser  
  *Firefox* (missing `OffscreenCanvas`) or *Safari* (missing `WebGL2`)  
  are not supported due to performance reasons  
- System with discrete **GPU**  
  integrated GPUs are not supported due to performance reasons  
- For optimal results video should be square with single person approximately in the center of the frame  
  example *FullHD* video trimmed with start/duration, cropped to center square and compressed:
  > ffmpeg \
  -i input.mp4 \
  -ss 00:00:10 -to 00:02:40 \
  -filter_complex "[0:v]crop=1080:1080:420:0[cropped]" \
  -map "[cropped]" \
  -vcodec libx264 \
  output.mp4

<br>

## Workflow

- Main thread listens to messages from worker thread
  - Video grab is processed and resized in the main thread using GPU
  - Image data is then transferred to worker thread for detection using `Human` library
  - Worker thread signals back to main thread when complete
  - When message is received by main thread it sends next frame for processing to worker thread
- Redraw loop in the main thread runs at constant 60 FPS
  - Interpolates last known detection results
  - Calls draw in a chosen output module
    - Video Overlay is drawn using built-in functions in `Human` library
    - 3D Mesh is drawn using `BabylonJS`

<br>

## Build & Run

Since this is WiP some required libraries are linked locally  
If you want to use it, change `dependencies` in `package.json` to packages published on **NPM**  

- `npm run prod`: compile and lint
- `npm run dev`: run dev http server and watch for source changes

<br>

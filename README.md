# Demo for Human with 3D Pose Mapping

- Analyze 2D input video
- Track 39 body keypoints in a web worker thread
- Display 3D body **overlay** or **wireframe** with *pan/zoom/rotate* functionality

> [**Live Demo**](https://vladmandic.github.io/human-pose/src/index.html)

<br>

![**Screenshot**](assets/screenshot.jpg)

<br>

## Limitations

- Must use **Chromium** based browser  
  *Firefox* (missing `OffscreenCanvas`) or *Safari* (missing `WebGL2`)  
  are not supported due to performance reasons  
- System with discrete **GPU**  
  integrated GPUs are not supported due to performance reasons  
- Avatar output is currently not enabled
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

- Video grab is processed and resized in the main thread using GPU
- Image data is then transferred to worker thread for detection
  - Worker thread signals back to main thread when complete
- Main thread listens to messages from worker thread
  - Dispatches draws request to a chosen output module
  - Sends next frame for processing to worker thread

<br>

## Build & Run

Since this is WiP some required libraries are linked locally  
If you want to use it, change `dependencies` in `package.json` to packages published on **NPM**  

- `npm run prod`: compile and lint
- `npm run dev`: run dev http server and watch for source changes

<br>

## Todo

1. Custom video uploads
2. Body box tracking within frame
3. Avatar animation

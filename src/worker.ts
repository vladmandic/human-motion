/// <reference lib="webworker" />

import * as H from '@vladmandic/human';

const log = (...msg: unknown[]) => console.log(...msg); // eslint-disable-line no-console

let human: H.Human; // instance of human that performs actual detection

onmessage = async (msg) => { // receive message from main thread
  if (!human) {
    human = new H.Human(msg.data.config as H.Config);
    await human.init();
    log('human', { worker: true, backend: human.tf.getBackend(), env: human.env });
  }
  if (msg.data.image) {
    const tensor = human.tf.tensor(msg.data.image, [1, msg.data.height, msg.data.width, 3], 'float32'); // recreate tensor from typed array received from main thread
    const result: H.Result = await human.detect(tensor as H.Tensor, msg.data.config as H.Config); // perform detection
    human.tf.dispose(tensor);
    postMessage({ result, state: JSON.stringify(human.tf.engine().state) }); // post result back to main thread
  }
};

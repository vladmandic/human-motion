/// <reference lib="webworker" />

import * as H from '@vladmandic/human';

let human: H.Human;

onmessage = async (msg) => {
  if (!human) human = new H.Human(msg.data.config as H.Config);
  if (msg.data.image) {
    let result: H.Result | null = null;
    const tensor = human.tf.tensor(msg.data.image, [1, msg.data.height, msg.data.width, 3], 'float32');
    result = await human.detect(tensor as H.Tensor, msg.data.config as H.Config);
    human.tf.dispose(tensor);
    postMessage({ result, state: JSON.stringify(human.tf.engine().state) });
  }
};

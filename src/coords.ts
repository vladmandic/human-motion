/* eslint-disable no-multi-spaces */

export const kpt: Array<string> = [ // keypoints defined in blazepose
  'Nose',            //  0
  'LeftEyeInside',   //  1
  'LeftEye',         //  2
  'LeftEyeOutside',  //  3
  'RightEyeInside',  //  4
  'RightEye',        //  5
  'RightEyeOutside', //  6
  'LeftEar',         //  7
  'RightEar',        //  8
  'LeftMouth',       //  9
  'RightMouth',      // 10
  'LeftShoulder',    // 11
  'RightShoulder',   // 12
  'LeftElbow',       // 13
  'RightElbow',      // 14
  'LeftWrist',       // 15
  'RightWrist',      // 16
  'LeftPinky',       // 17
  'RightPinky',      // 18
  'LeftIndex',       // 19
  'RightIndex',      // 20
  'LeftThumb',       // 21
  'RightThumb',      // 22
  'LeftHip',         // 23
  'RightHip',        // 24
  'LeftKnee',        // 25
  'RightKnee',       // 26
  'LeftAnkle',       // 27
  'RightAnkle',      // 28
  'LeftHeel',        // 29
  'RightHeel',       // 30
  'LeftFoot',        // 31
  'RightFoot',       // 32
  'bodyCenter',      // 33
  'bodyTop',         // 34
  'LeftPalm',        // 35 // z-coord not ok
  'LeftHand',        // 36 // z-coord not ok // similar to wrist
  'RightPalm',       // 37 // z-coord not ok
  'RightHand',       // 38 // z-coord not ok // similar to wrist
];

export const connected: Record<string, string[]> = {
  LeftLeg: ['LeftHip', 'LeftKnee', 'LeftAnkle', 'LeftHeel', 'LeftFoot'],
  RightLeg: ['RightHip', 'RightKnee', 'RightAnkle', 'RightHeel', 'RightFoot'],
  torso: ['LeftShoulder', 'RightShoulder', 'RightHip', 'LeftHip', 'LeftShoulder', 'RightShoulder'],
  LeftArm: ['LeftShoulder', 'LeftElbow', 'LeftWrist', 'LeftPalm'],
  RightArm: ['RightShoulder', 'RightElbow', 'RightWrist', 'RightPalm'],
  LeftEye: ['LeftEyeInside', 'LeftEye', 'LeftEyeOutside'],
  RightEye: ['RightEyeInside', 'RightEye', 'RightEyeOutside'],
  mouth: ['LeftMouth', 'RightMouth'],
  // LeftHand: ['LeftHand', 'LeftPalm', 'LeftPinky', 'LeftPalm', 'LeftIndex', 'LeftPalm', 'LeftThumb'],
  // RightHand: ['RightHand', 'RightPalm', 'RightPinky', 'RightPalm', 'RightIndex', 'RightPalm', 'RightThumb'],
};

export const bones: Array<string> = [ // keypoints defined in babylon `skeleton.bones[].name`
  'Hips',
  'Spine',
  'Spine1',
  'Spine2',
  'Neck',
  'Head',
  'HeadTop_End',
  'LeftEye',
  'RightEye',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'LeftHandMiddle1',
  'LeftHandMiddle2',
  'LeftHandMiddle3',
  'LeftHandMiddle4',
  'LeftHandThumb1',
  'LeftHandThumb2',
  'LeftHandThumb3',
  'LeftHandThumb4',
  'LeftHandIndex1',
  'LeftHandIndex2',
  'LeftHandIndex3',
  'LeftHandIndex4',
  'LeftHandRing1',
  'LeftHandRing2',
  'LeftHandRing3',
  'LeftHandRing4',
  'LeftHandPinky1',
  'LeftHandPinky2',
  'LeftHandPinky3',
  'LeftHandPinky4',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'RightHandMiddle1',
  'RightHandMiddle2',
  'RightHandMiddle3',
  'RightHandMiddle4',
  'RightHandThumb1',
  'RightHandThumb2',
  'RightHandThumb3',
  'RightHandThumb4',
  'RightHandIndex1',
  'RightHandIndex2',
  'RightHandIndex3',
  'RightHandIndex4',
  'RightHandRing1',
  'RightHandRing2',
  'RightHandRing3',
  'RightHandRing4',
  'RightHandPinky1',
  'RightHandPinky2',
  'RightHandPinky3',
  'RightHandPinky4',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
  'RightToeBase',
  'RightToe_End',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'LeftToeBase',
  'LeftToe_End',
];

export const pairs = [
  ['leftShoulder', 'leftElbow', 'LeftShoulder'],
  ['leftElbow', 'leftWrist', 'LeftForeArm'],
];

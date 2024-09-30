const ENCODING_BIT_RATE = 128; // kbps;
const COUNT_SAMPLES_PER_ENCODED_BLOCK = 1152;
const SAMPLE_RATE = 16000;

const readFileAsArrayBuffer = (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const blobReader = new FileReader();
    blobReader.onload = () => {
      resolve(blobReader.result as ArrayBuffer);
    };

    blobReader.onerror = () => {
      reject(blobReader.error);
    };

    blobReader.readAsArrayBuffer(blob);
  });

const toAudioBuffer = async (blob: Blob) => {
  const audioCtx = new AudioContext();

  const arrayBuffer = await readFileAsArrayBuffer(blob);
  const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
  if (audioCtx.state !== 'closed') await audioCtx.close();
  return decodedData;
};

const renderAudio = async (audioBuffer: AudioBuffer, sampleRate: number) => {
  const offlineAudioCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.duration * sampleRate,
    sampleRate
  );
  const source = offlineAudioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineAudioCtx.destination);
  source.start();

  return await offlineAudioCtx.startRendering();
};

const float32ArrayToInt16Array = (float32Arr: Float32Array) => {
  const int16Arr = new Int16Array(float32Arr.length);
  for (let i = 0; i < float32Arr.length; i++) {
    const float32Value = float32Arr[i];
    // Clamp the float value between -1 and 1
    const clampedValue = Math.max(-1, Math.min(1, float32Value));
    // Convert the float value to a signed 16-bit integer
    int16Arr[i] = Math.round(clampedValue * 32767);
  }
  return int16Arr;
};

const splitDataByChannel = (audioBuffer: AudioBuffer) =>
  Array.from({ length: audioBuffer.numberOfChannels }, (_, i) =>
    audioBuffer.getChannelData(i)
  ).map(float32ArrayToInt16Array);

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
export async function encodeWebmToMp3(blob: Blob, lameJs: any) {
  const audioBuffer = await renderAudio(await toAudioBuffer(blob), SAMPLE_RATE);
  const channelCount = audioBuffer.numberOfChannels;
  const dataByChannel = splitDataByChannel(audioBuffer);
  const mp3Encoder = new lameJs.Mp3Encoder(
    channelCount,
    SAMPLE_RATE,
    ENCODING_BIT_RATE
  );

  const dataBuffer: Int8Array[] = [];
  let remaining = dataByChannel[0].length;
  for (
    let i = 0;
    remaining >= COUNT_SAMPLES_PER_ENCODED_BLOCK;
    i += COUNT_SAMPLES_PER_ENCODED_BLOCK
  ) {
    const [leftChannelBlock, rightChannelBlock] = dataByChannel.map((channel) =>
      channel.subarray(i, i + COUNT_SAMPLES_PER_ENCODED_BLOCK)
    );
    dataBuffer.push(
      new Int8Array(
        mp3Encoder.encodeBuffer(leftChannelBlock, rightChannelBlock)
      )
    );
    remaining -= COUNT_SAMPLES_PER_ENCODED_BLOCK;
  }

  const lastBlock = mp3Encoder.flush();
  if (lastBlock.length) dataBuffer.push(new Int8Array(lastBlock));
  return new Blob(dataBuffer, { type: 'audio/mp3;sbu_type=voice' });
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

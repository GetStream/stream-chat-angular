import { Injectable, NgModule } from '@angular/core';
import { readBlobAsArrayBuffer } from '../file-utils';

export type TranscoderConfig = {
  sampleRate: number;
};

export type TranscodeParams = TranscoderConfig & {
  blob: Blob;
};

const WAV_HEADER_LENGTH_BYTES = 44;
const BYTES_PER_SAMPLE = 2;
const RIFF_FILE_MAX_BYTES = 4294967295;

const HEADER = {
  AUDIO_FORMAT: { offset: 20, value: 1 }, // PCM = 1
  BITS_PER_SAMPLE: { offset: 34, value: BYTES_PER_SAMPLE * 8 }, // 16 bits encoding
  BLOCK_ALIGN: { offset: 32 },
  BYTE_RATE: { offset: 28 },
  CHANNEL_COUNT: { offset: 22 }, // 1 - mono, 2 - stereo
  CHUNK_ID: { offset: 0, value: 0x52494646 }, // hex representation of string "RIFF" (Resource Interchange File Format) - identifies the file structure that defines a class of more specific file formats, e.g. WAVE
  CHUNK_SIZE: { offset: 4 },
  FILE_FORMAT: { offset: 8, value: 0x57415645 }, // hex representation of string "WAVE"
  SAMPLE_RATE: { offset: 24 },
  SUBCHUNK1_ID: { offset: 12, value: 0x666d7420 }, // hex representation of string "fmt " - identifies the start of "format" section of the header
  SUBCHUNK1_SIZE: { offset: 16, value: 16 }, // Subchunk1 Size without SUBCHUNK1_ID and SUBCHUNK1_SIZE fields
  SUBCHUNK2_ID: { offset: 36, value: 0x64617461 }, // hex representation of string "data" - identifies the start of actual audio data section
  SUBCHUNK2_SIZE: { offset: 40 }, // actual audio data size
} as const;

type WriteWaveHeaderParams = {
  arrayBuffer: ArrayBuffer;
  // 1 - mono, 2 - stereo
  channelCount: number;
  // Number of samples per second, e.g. 44100Hz
  sampleRate: number;
};

type WriteAudioDataParams = {
  arrayBuffer: ArrayBuffer;
  dataByChannel: Float32Array[];
};

/**
 * The `TranscoderService` is used to transcibe audio recording to a format that's supported by all major browsers. The SDK uses this to create voice messages.
 *
 * If you want to use your own transcoder you can provide a `customTranscoder`.
 */
@Injectable({ providedIn: NgModule })
export class TranscoderService {
  config: TranscoderConfig = {
    sampleRate: 16000,
  };
  customTranscoder?: (blob: Blob) => Blob | Promise<Blob>;
  constructor() {}

  /**
   * The default transcoder will leave audio/mp4 files as is, and transcode webm files to wav. If you want to customize this, you can provide your own transcoder using the `customTranscoder` field
   * @param blob
   * @returns the transcoded file
   */
  async transcode(blob: Blob) {
    if (this.customTranscoder) {
      return this.customTranscoder(blob);
    }
    if (blob.type.includes('audio/mp4')) {
      return blob;
    }
    const audioBuffer = await this.renderAudio(
      await this.toAudioBuffer(blob),
      this.config.sampleRate,
    );
    const numberOfSamples = audioBuffer.duration * this.config.sampleRate;
    const fileSizeBytes =
      numberOfSamples * audioBuffer.numberOfChannels * BYTES_PER_SAMPLE +
      WAV_HEADER_LENGTH_BYTES;

    const arrayBuffer = new ArrayBuffer(fileSizeBytes);
    this.writeWavHeader({
      arrayBuffer,
      channelCount: audioBuffer.numberOfChannels,
      sampleRate: this.config.sampleRate,
    });
    this.writeWavAudioData({
      arrayBuffer,
      dataByChannel: this.splitDataByChannel(audioBuffer),
    });
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  protected async renderAudio(audioBuffer: AudioBuffer, sampleRate: number) {
    const offlineAudioCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.duration * sampleRate,
      sampleRate,
    );
    const source = offlineAudioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineAudioCtx.destination);
    source.start();

    return await offlineAudioCtx.startRendering();
  }

  protected async toAudioBuffer(blob: Blob) {
    const audioCtx = new AudioContext();

    const arrayBuffer = await readBlobAsArrayBuffer(blob);
    const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
    if (audioCtx.state !== 'closed') await audioCtx.close();
    return decodedData;
  }

  protected writeWavAudioData({
    arrayBuffer,
    dataByChannel,
  }: WriteAudioDataParams) {
    const dataView = new DataView(arrayBuffer);
    const channelCount = dataByChannel.length;

    dataByChannel.forEach((channelData, channelIndex) => {
      let writeOffset = WAV_HEADER_LENGTH_BYTES + channelCount * channelIndex;

      channelData.forEach((float32Value) => {
        dataView.setInt16(
          writeOffset,
          float32Value < 0
            ? Math.max(-1, float32Value) * 32768
            : Math.min(1, float32Value) * 32767,
          true,
        );
        writeOffset += channelCount * BYTES_PER_SAMPLE;
      });
    });
  }

  protected writeWavHeader({
    arrayBuffer,
    channelCount,
    sampleRate,
  }: WriteWaveHeaderParams) {
    const byteRate = sampleRate * channelCount * BYTES_PER_SAMPLE; // bytes/sec
    const blockAlign = channelCount * BYTES_PER_SAMPLE;

    const dataView = new DataView(arrayBuffer);
    /*
     * The maximum size of a RIFF file is 4294967295 bytes and since the header takes up 44 bytes there are 4294967251 bytes left for the
     * data chunk.
     */
    const dataChunkSize = Math.min(
      dataView.byteLength - WAV_HEADER_LENGTH_BYTES,
      RIFF_FILE_MAX_BYTES - WAV_HEADER_LENGTH_BYTES,
    );

    dataView.setUint32(HEADER.CHUNK_ID.offset, HEADER.CHUNK_ID.value); // "RIFF"
    dataView.setUint32(
      HEADER.CHUNK_SIZE.offset,
      arrayBuffer.byteLength - 8,
      true,
    ); // adjustment for the first two headers - chunk id + file size
    dataView.setUint32(HEADER.FILE_FORMAT.offset, HEADER.FILE_FORMAT.value); // "WAVE"

    dataView.setUint32(HEADER.SUBCHUNK1_ID.offset, HEADER.SUBCHUNK1_ID.value); // "fmt "
    dataView.setUint32(
      HEADER.SUBCHUNK1_SIZE.offset,
      HEADER.SUBCHUNK1_SIZE.value,
      true,
    );
    dataView.setUint16(
      HEADER.AUDIO_FORMAT.offset,
      HEADER.AUDIO_FORMAT.value,
      true,
    );
    dataView.setUint16(HEADER.CHANNEL_COUNT.offset, channelCount, true);
    dataView.setUint32(HEADER.SAMPLE_RATE.offset, sampleRate, true);
    dataView.setUint32(HEADER.BYTE_RATE.offset, byteRate, true);
    dataView.setUint16(HEADER.BLOCK_ALIGN.offset, blockAlign, true);
    dataView.setUint16(
      HEADER.BITS_PER_SAMPLE.offset,
      HEADER.BITS_PER_SAMPLE.value,
      true,
    );

    dataView.setUint32(HEADER.SUBCHUNK2_ID.offset, HEADER.SUBCHUNK2_ID.value); // "data"
    dataView.setUint32(HEADER.SUBCHUNK2_SIZE.offset, dataChunkSize, true);
  }

  protected splitDataByChannel = (audioBuffer: AudioBuffer) =>
    Array.from({ length: audioBuffer.numberOfChannels }, (_, i) =>
      audioBuffer.getChannelData(i),
    );
}

import { Injectable, NgModule } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChatClientService } from '../chat-client.service';

const MAX_FREQUENCY_AMPLITUDE = 255 as const;

const rootMeanSquare = (values: Uint8Array) =>
  Math.sqrt(
    values.reduce((acc, val) => acc + Math.pow(val, 2), 0) / values.length
  );

/**
 * fftSize
 * An unsigned integer, representing the window size of the FFT, given in number of samples.
 * A higher value will result in more details in the frequency domain but fewer details
 * in the amplitude domain.
 *
 * Must be a power of 2 between 2^5 and 2^15, so one of: 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, and 32768.
 * Defaults to 32.
 *
 * maxDecibels
 * A double, representing the maximum decibel value for scaling the FFT analysis data,
 * where 0 dB is the loudest possible sound, -10 dB is a 10th of that, etc.
 * The default value is -30 dB.
 *
 * minDecibels
 * A double, representing the minimum decibel value for scaling the FFT analysis data,
 * where 0 dB is the loudest possible sound, -10 dB is a 10th of that, etc.
 * The default value is -100 dB.
 */
export type AmplitudeAnalyserConfig = Pick<
  AnalyserNode,
  'fftSize' | 'maxDecibels' | 'minDecibels'
>;
export type AmplitudeRecorderConfig = {
  analyserConfig: AmplitudeAnalyserConfig;
  sampleCount: number;
  samplingFrequencyMs: number;
};

export const DEFAULT_AMPLITUDE_RECORDER_CONFIG: AmplitudeRecorderConfig = {
  analyserConfig: {
    fftSize: 32,
    maxDecibels: 0,
    minDecibels: -100,
  } as AmplitudeAnalyserConfig,
  sampleCount: 100,
  samplingFrequencyMs: 60,
};

/**
 * The `AmplitudeRecorderService` is a utility service used to create amplitude values for voice recordings, making it possible to display a wave bar
 */
@Injectable({ providedIn: NgModule })
export class AmplitudeRecorderService {
  config = DEFAULT_AMPLITUDE_RECORDER_CONFIG;
  amplitudes$: Observable<number[]>;
  error$: Observable<Error | undefined>;

  private amplitudesSubject = new BehaviorSubject<number[]>([]);
  private errorSubject = new BehaviorSubject<Error | undefined>(undefined);
  private audioContext: AudioContext | undefined;
  private analyserNode: AnalyserNode | undefined;
  private microphone: MediaStreamAudioSourceNode | undefined;
  private stream: MediaStream | undefined;
  private amplitudeSamplingInterval: ReturnType<typeof setInterval> | undefined;

  constructor(private chatService: ChatClientService) {
    this.amplitudes$ = this.amplitudesSubject.asObservable();
    this.error$ = this.errorSubject.asObservable();
  }

  /**
   * The recorded amplitudes
   */
  get amplitudes() {
    return this.amplitudesSubject.value;
  }

  /**
   * Start amplitude recording for the given media stream
   * @param stream
   */
  start = (stream: MediaStream) => {
    this.stop();

    this.stream = stream;
    this.init();

    this.resume();
  };

  /**
   * Temporarily pause amplitude recording, recording can be resumed with `resume`
   */
  pause() {
    clearInterval(this.amplitudeSamplingInterval);
    this.amplitudeSamplingInterval = undefined;
  }

  /**
   * Resume amplited recording after it was pasued
   */
  resume() {
    this.amplitudeSamplingInterval = setInterval(() => {
      if (!this.analyserNode) {
        return;
      }
      const frequencyBins = new Uint8Array(this.analyserNode.frequencyBinCount);
      try {
        this.analyserNode.getByteFrequencyData(frequencyBins);
      } catch (e) {
        this.logError(e as Error);
        this.errorSubject.next(e as Error);
        return;
      }
      const normalizedSignalStrength =
        rootMeanSquare(frequencyBins) / MAX_FREQUENCY_AMPLITUDE;
      this.amplitudesSubject.next([
        ...this.amplitudesSubject.value,
        normalizedSignalStrength,
      ]);
    }, this.config.samplingFrequencyMs);
  }

  /**
   * Stop the amplitude recording and frees up used resources
   */
  stop() {
    if (!this.stream) {
      return;
    }
    this.stream = undefined;
    clearInterval(this.amplitudeSamplingInterval);
    this.amplitudeSamplingInterval = undefined;
    this.amplitudesSubject.next([]);
    this.errorSubject.next(undefined);
    this.microphone?.disconnect();
    this.analyserNode?.disconnect();
    if (this.audioContext?.state !== 'closed') {
      void this.audioContext?.close();
    }
  }

  private init() {
    if (!this.stream) {
      return;
    }

    this.audioContext = new AudioContext();
    this.analyserNode = this.audioContext.createAnalyser();
    const { analyserConfig } = this.config;
    this.analyserNode.fftSize = analyserConfig.fftSize;
    this.analyserNode.maxDecibels = analyserConfig.maxDecibels;
    this.analyserNode.minDecibels = analyserConfig.minDecibels;

    this.microphone = this.audioContext.createMediaStreamSource(this.stream);
    this.microphone.connect(this.analyserNode);
  }

  private logError(error: Error) {
    this.chatService.chatClient?.logger('error', error.message, {
      error: error,
      tag: ['AmplitudeRecorderService'],
    });
  }
}

import { Injectable } from '@angular/core';
import { AmplitudeRecorderService } from './amplitude-recorder.service';
import { isSafari } from '../is-safari';
import { MediaRecorderConfig, MultimediaRecorder } from './media-recorder';
import { NotificationService } from '../notification.service';
import { ChatClientService } from '../chat-client.service';
import { TranscoderService } from './transcoder.service';
import { resampleWaveForm } from '../wave-form-sampler';
import { AudioRecording, MediaRecording } from '../types';
import { NgModel } from '@angular/forms';

/**
 * The `AudioRecorderService` can record an audio file, the SDK uses this to record a voice message
 */
@Injectable({ providedIn: NgModel })
export class AudioRecorderService extends MultimediaRecorder<
  Omit<AudioRecording, keyof MediaRecording>
> {
  /**
   * Due to browser restrictions the following config is used:
   * - In Safari we record in audio/mp4
   * - For all other browsers we use audio/webm (which is then transcoded to wav)
   */
  config: MediaRecorderConfig = {
    mimeType: isSafari() ? 'audio/mp4;codecs=mp4a.40.2' : 'audio/webm',
  };

  constructor(
    notificationService: NotificationService,
    chatService: ChatClientService,
    transcoder: TranscoderService,
    private amplitudeRecorder: AmplitudeRecorderService
  ) {
    super(notificationService, chatService, transcoder);
  }

  protected enrichWithExtraData() {
    const waveformData = resampleWaveForm(
      this.amplitudeRecorder.amplitudes,
      this.amplitudeRecorder.config.sampleCount
    );

    return { waveform_data: waveformData };
  }

  /**
   * Start audio recording
   */
  async start() {
    const result = await super.start();

    if (this.mediaRecorder?.stream) {
      this.amplitudeRecorder.start(this.mediaRecorder?.stream);
    }

    return result;
  }

  /**
   * Pause audio recording, it can be restarted using `resume`
   */
  pause() {
    const result = super.pause();

    this.amplitudeRecorder.pause();

    return result;
  }

  /**
   * Resume a previously paused recording
   */
  resume() {
    const result = super.resume();

    this.amplitudeRecorder.resume();

    return result;
  }

  /**
   * Stop the recording and free up used resources
   * @param options
   * @param options.cancel if this is `true` no recording will be created, but resources will be freed
   * @returns the recording
   */
  async stop(options?: { cancel: boolean }) {
    try {
      const result = await super.stop(options);

      return result;
    } finally {
      this.amplitudeRecorder.stop();
    }
  }
}

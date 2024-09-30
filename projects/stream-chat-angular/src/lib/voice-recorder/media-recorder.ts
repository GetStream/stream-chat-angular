import { BehaviorSubject, Observable } from 'rxjs';
import {
  createFileFromBlobs,
  createUriFromBlob,
  getExtensionFromMimeType,
} from '../file-utils';
import { NotificationService } from '../notification.service';
import { ChatClientService } from '../chat-client.service';
import fixWebmDuration from 'fix-webm-duration';
import { TranscoderService } from './transcoder.service';
import { MediaRecording } from '../types';

export type MediaRecorderConfig = Omit<MediaRecorderOptions, 'mimeType'> &
  Required<Pick<MediaRecorderOptions, 'mimeType'>>;

export enum MediaRecordingState {
  PAUSED = 'paused',
  RECORDING = 'recording',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export type MediaRecordingTitleOptions = {
  mimeType: string;
};

export abstract class MultimediaRecorder<T = null> {
  abstract config: MediaRecorderConfig;
  customGenerateRecordingTitle:
    | ((options: MediaRecordingTitleOptions) => string)
    | undefined;
  recordingState$: Observable<MediaRecordingState>;
  recording$: Observable<(MediaRecording & T) | undefined>;

  protected recordingSubject = new BehaviorSubject<
    (MediaRecording & T) | undefined
  >(undefined);

  protected mediaRecorder: MediaRecorder | undefined;
  protected startTime: number | undefined;
  protected recordedChunkDurations: number[] = [];
  private recordingStateSubject = new BehaviorSubject<MediaRecordingState>(
    MediaRecordingState.STOPPED
  );

  constructor(
    protected notificationService: NotificationService,
    protected chatService: ChatClientService,
    private transcoder: TranscoderService
  ) {
    this.recording$ = this.recordingSubject.asObservable();
    this.recordingState$ = this.recordingStateSubject.asObservable();
  }

  get durationMs() {
    return (
      this.recordedChunkDurations.reduce((acc, val) => acc + val, 0) +
      (this.startTime ? Date.now() - this.startTime : 0)
    );
  }

  get mediaType() {
    return this.config.mimeType.split('/')?.[0] || 'unknown';
  }

  get isRecording() {
    return (
      this.recordingStateSubject.value === MediaRecordingState.RECORDING ||
      this.recordingStateSubject.value === MediaRecordingState.PAUSED
    );
  }

  generateRecordingTitle = (mimeType: string) => {
    if (this.customGenerateRecordingTitle) {
      return this.customGenerateRecordingTitle({ mimeType });
    } else {
      return `${
        this.mediaType
      }_recording_${new Date().toISOString()}.${getExtensionFromMimeType(
        mimeType
      )}`; // extension needed so that desktop Safari can play the asset
    }
  };

  async makeRecording(blob: Blob) {
    const { mimeType } = this.config;
    try {
      if (mimeType.includes('webm')) {
        // The browser does not include duration metadata with the recorded blob
        blob = await fixWebmDuration(blob, this.durationMs, {
          logger: () => null, // prevents polluting the browser console
        });
      }
      blob = await this.transcoder.transcode(blob);

      if (!blob) return;

      const file = createFileFromBlobs({
        blobsArray: [blob],
        fileName: this.generateRecordingTitle(blob.type),
        mimeType: blob.type,
      });
      const previewUrl = await createUriFromBlob(file);

      const extraData = this.enrichWithExtraData();
      this.recordingSubject.next({
        recording: file,
        duration: this.durationMs / 1000,
        asset_url: previewUrl,
        mime_type: mimeType,
        ...extraData,
      });
      return file;
    } catch (error) {
      this.logError(error as Error);
      this.recordingStateSubject.next(MediaRecordingState.ERROR);
      return undefined;
    }
  }

  handleErrorEvent = (e: Event) => {
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
    this.logError((e as ErrorEvent).error);
    this.recordingStateSubject.next(MediaRecordingState.ERROR);
    this.notificationService.addTemporaryNotification(
      'streamChat.An error has occurred during recording'
    );
    void this.stop({ cancel: true });
  };

  handleDataavailableEvent = (e: BlobEvent) => {
    if (!e.data.size) return;
    void this.makeRecording(e.data);
  };

  get recordingState() {
    return this.recordingStateSubject.value;
  }

  async start() {
    if (
      [MediaRecordingState.RECORDING, MediaRecordingState.PAUSED].includes(
        this.recordingStateSubject.value
      )
    ) {
      return;
    }

    this.recordingSubject.next(undefined);

    // account for requirement on iOS as per this bug report: https://bugs.webkit.org/show_bug.cgi?id=252303
    if (!navigator.mediaDevices) {
      console.warn(
        `[Stream Chat] Media devices API missing, it's possible your app is not served from a secure context (https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)`
      );
      const error = new Error('Media recording is not supported');
      this.logError(error);
      this.recordingStateSubject.next(MediaRecordingState.ERROR);
      this.notificationService.addTemporaryNotification(
        `streamChat.Media recording not supported`
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, this.config);

      this.mediaRecorder.addEventListener(
        'dataavailable',
        this.handleDataavailableEvent
      );
      this.mediaRecorder.addEventListener('error', this.handleErrorEvent);

      this.startTime = new Date().getTime();
      this.mediaRecorder.start();

      this.recordingStateSubject.next(MediaRecordingState.RECORDING);
    } catch (error) {
      this.logError(error as Error);
      void this.stop({ cancel: true });
      this.recordingStateSubject.next(MediaRecordingState.ERROR);
      const isNotAllowed = (error as Error).name?.includes('NotAllowedError');
      this.notificationService.addTemporaryNotification(
        isNotAllowed
          ? `streamChat.Please grant permission to use microhpone`
          : `streamChat.Error starting recording`
      );
    }
  }

  pause() {
    if (this.recordingStateSubject.value !== MediaRecordingState.RECORDING)
      return;
    if (this.startTime) {
      this.recordedChunkDurations.push(new Date().getTime() - this.startTime);
      this.startTime = undefined;
    }
    this.mediaRecorder?.pause();
    this.recordingStateSubject.next(MediaRecordingState.PAUSED);
  }

  resume() {
    if (this.recordingStateSubject.value !== MediaRecordingState.PAUSED) return;
    this.startTime = new Date().getTime();
    this.mediaRecorder?.resume();
    this.recordingStateSubject.next(MediaRecordingState.RECORDING);
  }

  async stop(options: { cancel: boolean } = { cancel: false }) {
    if (this.startTime) {
      this.recordedChunkDurations.push(new Date().getTime() - this.startTime);
      this.startTime = undefined;
    }
    let recording!: MediaRecording & T;
    this.mediaRecorder?.stop();
    try {
      if (
        !options.cancel &&
        this.recordingStateSubject.value !== MediaRecordingState.ERROR
      ) {
        recording = await new Promise((resolve, reject) => {
          this.recording$.subscribe((r) => {
            if (r) {
              resolve(r);
            }
          });
          this.recordingState$.subscribe((s) => {
            if (s === MediaRecordingState.ERROR) {
              reject(new Error(`Recording couldn't be created`));
            }
          });
        });
      }
    } catch {
      this.notificationService.addTemporaryNotification(
        'streamChat.An error has occurred during recording'
      );
    } finally {
      this.recordedChunkDurations = [];
      this.startTime = undefined;

      this.mediaRecorder?.removeEventListener(
        'dataavailable',
        this.handleDataavailableEvent
      );
      this.mediaRecorder?.removeEventListener('error', this.handleErrorEvent);
      if (this.mediaRecorder?.stream?.active) {
        this.mediaRecorder?.stream?.getTracks().forEach((track) => {
          track.stop();
          this.mediaRecorder?.stream?.removeTrack(track);
        });
        this.mediaRecorder = undefined;
      }

      this.recordingStateSubject.next(MediaRecordingState.STOPPED);
    }

    return recording;
  }

  protected abstract enrichWithExtraData(): T;

  protected logError(error: Error) {
    this.chatService.chatClient?.logger('error', error.message, {
      error: error,
      tag: ['MediaRecorder'],
    });
  }
}

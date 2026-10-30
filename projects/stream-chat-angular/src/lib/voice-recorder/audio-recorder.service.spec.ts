import { TestBed } from '@angular/core/testing';
import { AudioRecorderService } from './audio-recorder.service';
import { TranscoderService } from './transcoder.service';
import { AmplitudeRecorderService } from './amplitude-recorder.service';
import { ChatClientService } from '../chat-client.service';
import { NotificationService } from '../notification.service';
import { MediaRecordingState } from './media-recorder';

class FakeMediaRecorder extends EventTarget {
  stream = {
    active: true,
    getTracks: () => [],
    removeTrack: () => {},
  };
  start = jasmine.createSpy('start');
  pause = jasmine.createSpy('pause');
  resume = jasmine.createSpy('resume');
  stop = jasmine.createSpy('stop').and.callFake(() => {
    this.dispatchEvent(
      new BlobEvent('dataavailable', {
        data: new Blob(['recording'], { type: 'audio/mp4' }),
      })
    );
  });
}

describe('AudioRecorderService', () => {
  let service: AudioRecorderService;
  let transcoder: TranscoderService;
  let addTemporaryNotification: jasmine.Spy;
  let states: MediaRecordingState[];
  let fakeMediaRecorder: FakeMediaRecorder;
  let getUserMedia: jasmine.Spy;
  let mediaDevices: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AudioRecorderService,
        TranscoderService,
        {
          provide: AmplitudeRecorderService,
          useValue: {
            start: jasmine.createSpy(),
            stop: jasmine.createSpy(),
            pause: jasmine.createSpy(),
            resume: jasmine.createSpy(),
            amplitudes: [],
            config: { sampleCount: 100 },
          },
        },
        {
          provide: ChatClientService,
          useValue: { logger: { error: jasmine.createSpy() } },
        },
      ],
    });
    // The service reads MediaRecorder.isTypeSupported when created, so we create it before stubbing MediaRecorder
    service = TestBed.inject(AudioRecorderService);
    // Skip fixWebmDuration, the recording is a fake blob
    service.config = { mimeType: 'audio/mp4' };
    transcoder = TestBed.inject(TranscoderService);
    addTemporaryNotification = spyOn(
      TestBed.inject(NotificationService),
      'addTemporaryNotification'
    ).and.callThrough();
    states = [];
    service.recordingState$.subscribe((s) => states.push(s));

    fakeMediaRecorder = new FakeMediaRecorder();
    getUserMedia = jasmine
      .createSpy('getUserMedia')
      .and.resolveTo({} as MediaStream);
    // jasmine restores the original navigator.mediaDevices and MediaRecorder after each test
    mediaDevices = spyOnProperty(
      navigator,
      'mediaDevices',
      'get'
    ).and.returnValue({
      getUserMedia,
    } as unknown as MediaDevices);
    spyOn(window, 'MediaRecorder').and.returnValue(
      fakeMediaRecorder as unknown as MediaRecorder
    );
  });

  it('should start recording', async () => {
    await service.start();

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(fakeMediaRecorder.start).toHaveBeenCalledWith();
    expect(service.recordingState).toBe(MediaRecordingState.RECORDING);
    expect(addTemporaryNotification).not.toHaveBeenCalled();
  });

  it('should display error notification if media recording is not supported', async () => {
    mediaDevices.and.returnValue(undefined);

    await service.start();

    expect(window.MediaRecorder).not.toHaveBeenCalled();
    expect(addTemporaryNotification).toHaveBeenCalledOnceWith(
      'streamChat.Media recording not supported'
    );
    expect(service.recordingState).toBe(MediaRecordingState.ERROR);
  });

  it('should display error notification if microphone permission is not granted', async () => {
    getUserMedia.and.rejectWith(new DOMException('', 'NotAllowedError'));

    await service.start();

    expect(addTemporaryNotification).toHaveBeenCalledOnceWith(
      'streamChat.Please grant permission to use microhpone'
    );
    expect(service.recordingState).toBe(MediaRecordingState.ERROR);
  });

  it('should display error notification if recording could not be started - getUserMedia error', async () => {
    getUserMedia.and.rejectWith(
      new DOMException('Requested device not found', 'NotFoundError')
    );

    await service.start();

    expect(addTemporaryNotification).toHaveBeenCalledOnceWith(
      'streamChat.Error starting recording'
    );
    expect(service.recordingState).toBe(MediaRecordingState.ERROR);
  });

  it('should display error notification if recording could not be started - MediaRecorder error', async () => {
    (window.MediaRecorder as unknown as jasmine.Spy).and.throwError(
      new DOMException('Unsupported mime type', 'NotSupportedError')
    );

    await service.start();

    expect(addTemporaryNotification).toHaveBeenCalledOnceWith(
      'streamChat.Error starting recording'
    );
    expect(service.recordingState).toBe(MediaRecordingState.ERROR);
  });

  it('should display error notification if an error occurs during recording', async () => {
    await service.start();
    fakeMediaRecorder.dispatchEvent(
      new ErrorEvent('error', {
        error: new DOMException('Recording failed', 'UnknownError'),
      })
    );

    expect(addTemporaryNotification).toHaveBeenCalledOnceWith(
      'streamChat.An error has occurred during recording'
    );
    expect(states).toContain(MediaRecordingState.ERROR);
    // The recorder is stopped after the error
    expect(fakeMediaRecorder.stop).toHaveBeenCalledWith();
  });

  it('should display error notification if recording could not be created', async () => {
    await service.start();
    const transcode = spyOn(transcoder, 'transcode').and.rejectWith(
      new Error('transcode failed')
    );

    const recording = await service.stop();

    expect(transcode).toHaveBeenCalledWith(jasmine.any(Blob));
    expect(recording).toBeUndefined();
    expect(addTemporaryNotification).toHaveBeenCalledOnceWith(
      'streamChat.An error has occurred during recording'
    );
    expect(states).toContain(MediaRecordingState.ERROR);
  });
});

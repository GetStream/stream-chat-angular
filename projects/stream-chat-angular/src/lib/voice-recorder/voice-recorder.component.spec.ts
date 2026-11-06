import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { VoiceRecorderService } from '../message-input/voice-recorder.service';
import { AudioRecording } from '../types';
import { VoiceRecordingComponent } from '../voice-recording/voice-recording.component';

import { VoiceRecorderComponent } from './voice-recorder.component';
import { VoiceRecorderModule } from './voice-recorder.module';

describe('VoiceRecorderComponent', () => {
  let component: VoiceRecorderComponent;
  let fixture: ComponentFixture<VoiceRecorderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoiceRecorderModule],
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceRecorderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const openRecorder = () => {
    const voiceRecorderService = new VoiceRecorderService();
    component.voiceRecorderService = voiceRecorderService;
    component.ngOnChanges({
      voiceRecorderService: new SimpleChange(
        undefined,
        voiceRecorderService,
        true
      ),
    });
    voiceRecorderService.isRecorderVisible$.next(true);
    fixture.detectChanges();
  };

  it('should pass the recording to the playback component in the attachment format', async () => {
    const recording: AudioRecording = {
      recording: new File([], 'recording.webm'),
      duration: 3.5,
      mime_type: 'audio/webm',
      asset_url: 'data:audio/webm;base64,',
      waveform_data: [0.1, 0.5],
    };
    spyOn(component.recorder, 'stop').and.resolveTo(recording);
    openRecorder();

    await component.stop();
    fixture.detectChanges();

    const playback = fixture.debugElement.query(
      By.directive(VoiceRecordingComponent)
    ).componentInstance as VoiceRecordingComponent;

    expect(playback.attachment).toEqual({
      type: 'voiceRecording',
      asset_url: 'data:audio/webm;base64,',
      custom: {
        mime_type: 'audio/webm',
        duration: 3.5,
        waveform_data: [0.1, 0.5],
      },
    });
  });

  it('should remove the recording from the playback component on cancel', async () => {
    spyOn(component.recorder, 'stop').and.resolveTo({
      recording: new File([], 'recording.webm'),
      duration: 1,
      mime_type: 'audio/webm',
      asset_url: 'data:audio/webm;base64,',
      waveform_data: [],
    });
    openRecorder();
    await component.stop();
    fixture.detectChanges();

    component.cancel();
    fixture.detectChanges();

    expect(component.recordingAttachment).toBeUndefined();
    expect(
      fixture.debugElement.query(By.directive(VoiceRecordingComponent))
    ).toBeNull();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { VoiceRecorderWavebarComponent } from './voice-recorder-wavebar.component';
import { AudioRecorderService } from '../audio-recorder.service';
import { AmplitudeRecorderService } from '../amplitude-recorder.service';
import { TranscoderService } from '../transcoder.service';

describe('VoiceRecorderWavebarComponent', () => {
  let component: VoiceRecorderWavebarComponent;
  let fixture: ComponentFixture<VoiceRecorderWavebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VoiceRecorderWavebarComponent],
      providers: [
        AudioRecorderService,
        AmplitudeRecorderService,
        TranscoderService,
      ],
    })
      .overrideComponent(VoiceRecorderWavebarComponent, {
        set: { changeDetection: ChangeDetectionStrategy.Default },
      })
      .compileComponents();

    fixture = TestBed.createComponent(VoiceRecorderWavebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

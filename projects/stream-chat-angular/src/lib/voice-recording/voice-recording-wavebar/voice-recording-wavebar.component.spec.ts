import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { VoiceRecordingWavebarComponent } from './voice-recording-wavebar.component';

describe('VoiceRecordingWavebarComponent', () => {
  let component: VoiceRecordingWavebarComponent;
  let fixture: ComponentFixture<VoiceRecordingWavebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VoiceRecordingWavebarComponent],
    })
      .overrideComponent(VoiceRecordingWavebarComponent, {
        set: { changeDetection: ChangeDetectionStrategy.Default },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VoiceRecordingWavebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

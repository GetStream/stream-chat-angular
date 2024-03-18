import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoiceRecordingWavebarComponent } from './voice-recording-wavebar.component';

describe('VoiceRecordingWavebarComponent', () => {
  let component: VoiceRecordingWavebarComponent;
  let fixture: ComponentFixture<VoiceRecordingWavebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VoiceRecordingWavebarComponent],
    }).compileComponents();
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

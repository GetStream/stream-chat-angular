import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoiceRecordingComponent } from './voice-recording.component';
import { mockVoiceRecording } from '../mocks';
import { SimpleChange } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

describe('VoiceRecordingComponent', () => {
  let component: VoiceRecordingComponent;
  let fixture: ComponentFixture<VoiceRecordingComponent>;
  let audioElement: HTMLAudioElement;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VoiceRecordingComponent],
      imports: [TranslateModule.forRoot()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VoiceRecordingComponent);
    component = fixture.componentInstance;
    component.attachment = mockVoiceRecording;
    component.ngOnChanges({ attachment: {} as SimpleChange });
    fixture.detectChanges();

    nativeElement = fixture.nativeElement as HTMLElement;
    audioElement = nativeElement.querySelector('audio')!;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should play and pause voice recording', () => {
    spyOn(audioElement, 'play').and.callFake(() => Promise.resolve());
    spyOn(audioElement, 'pause').and.callFake(() => {});

    const button = nativeElement.querySelector<HTMLButtonElement>(
      '[data-testid="play-button"]'
    )!;

    button.click();
    fixture.detectChanges();

    expect(audioElement.play).toHaveBeenCalledWith();

    Object.defineProperty(audioElement, 'paused', { value: false });
    button.click();
    fixture.detectChanges();

    expect(audioElement.pause).toHaveBeenCalledWith();
  });

  it('should set playback rate', () => {
    expect(audioElement.playbackRate).toBe(1);

    Object.defineProperty(audioElement, 'paused', { value: false });
    fixture.detectChanges();
    const button = nativeElement.querySelector<HTMLButtonElement>(
      '[data-testid="playback-rate-button"]'
    )!;
    button.click();
    fixture.detectChanges();

    expect(audioElement.playbackRate).toBe(1.5);
    expect(button.textContent).toContain('1.5x');

    component.setPlaybackRate();

    expect(audioElement.playbackRate).toBe(2);

    component.setPlaybackRate();

    expect(audioElement.playbackRate).toBe(1);
  });

  it('should display elapsed time', () => {
    expect(component.secondsElapsedFormatted).toBe('00:00');

    Object.defineProperty(audioElement, 'currentTime', { value: 1.736871 });
    audioElement.dispatchEvent(new Event('timeupdate'));

    expect(component.secondsElapsedFormatted).toBe('00:02');
    const div = nativeElement.querySelector('[data-testid="duration"]');

    expect(div?.innerHTML).toContain(component.secondsElapsedFormatted);
  });

  it('should display duration from attachment data not from audio element', () => {
    // Firefox reports inaccurate duration for AAC files
    // When the audio ended, currentTime will be duration, so we can't trust currentTime at that point
    Object.defineProperty(audioElement, 'currentTime', { value: 125.4444 });
    Object.defineProperty(audioElement, 'ended', { value: true });
    audioElement.dispatchEvent(new Event('timeupdate'));

    expect(component.secondsElapsedFormatted).toBe('00:22');
  });

  it('should display duration initially', () => {
    expect(component.durationFormatted).toBe('00:22');

    const div = nativeElement.querySelector('[data-testid="duration"]');

    expect(div?.innerHTML).toContain(component.durationFormatted);
  });

  it('should display file size', () => {
    expect(component.fileSize).toBe('56.5 kB');
  });

  it('should set error state from play', async () => {
    spyOn(audioElement, 'play').and.callFake(() => Promise.reject());

    expect(component.isError).toBeFalse();

    await component.togglePlay();
    fixture.detectChanges();

    expect(component.isError).toBeTrue();
    expect(
      nativeElement.querySelector('[data-testid="error-message"]')?.innerHTML
    ).toContain('Error playing audio');
  });

  it('should set error state', () => {
    expect(component.isError).toBeFalse();

    audioElement.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(component.isError).toBeTrue();
  });
});

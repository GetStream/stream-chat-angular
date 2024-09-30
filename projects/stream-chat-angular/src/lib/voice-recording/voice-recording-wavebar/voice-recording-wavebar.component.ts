import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { resampleWaveForm } from '../../wave-form-sampler';

/**
 * This component can be used to visualize the wave bar of a voice recording
 */
@Component({
  selector: 'stream-voice-recording-wavebar',
  templateUrl: './voice-recording-wavebar.component.html',
  styles: [],
})
export class VoiceRecordingWavebarComponent
  implements OnInit, OnChanges, AfterViewInit
{
  /**
   * The audio element that plays the voice recording
   */
  @Input() audioElement?: HTMLAudioElement;
  /**
   * The waveform data to visualize
   */
  @Input() waveFormData: number[] = [];
  /**
   * The duration of the voice recording in seconds
   */
  @Input() duration?: number;
  resampledWaveFormData: number[] = [];
  progress: number = 0;
  isDragging = false;
  private sampleSize: number = 40;
  @ViewChild('container', { static: true })
  private container?: ElementRef<HTMLElement>;
  private isViewInited = false;

  constructor(private ngZone: NgZone, private cdRef: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.containerSizeChanged();
    if (this.container?.nativeElement) {
      this.ngZone.runOutsideAngular(() => {
        new ResizeObserver(() => {
          this.containerSizeChanged();
        }).observe(this.container!.nativeElement);
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.waveFormData) {
      this.resampledWaveFormData = resampleWaveForm(
        this.waveFormData,
        this.sampleSize
      );
    }
    if (changes.audioElement) {
      this.ngZone.runOutsideAngular(() => {
        this.audioElement?.addEventListener('timeupdate', () => {
          const progress =
            (this.audioElement?.currentTime || 0) / (this.duration || 0) || 0;
          if (Math.abs(progress - this.progress) >= 0.02) {
            this.ngZone.run(() => {
              this.progress = progress;
              this.cdRef.detectChanges();
            });
          }
        });
      });
    }
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
  }

  seek(event: MouseEvent) {
    const containerWidth =
      this.container?.nativeElement?.getBoundingClientRect().width || 0;
    const containerStart =
      this.container?.nativeElement?.getBoundingClientRect()?.x || 0;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const progress = (event.x - containerStart) / containerWidth;

    if (!isNaN(progress) && this.audioElement) {
      const duration = this.duration || 0;
      const time = duration * progress;
      this.audioElement.currentTime = time;
    }
  }

  trackByIndex(index: number) {
    return index;
  }

  private containerSizeChanged() {
    if (!this.container?.nativeElement) {
      return;
    }
    const containerWidth = this.container.nativeElement.clientWidth;
    if (containerWidth === 0) {
      return;
    }
    const barWidth = +getComputedStyle(this.container.nativeElement)
      .getPropertyValue('--str-chat__voice-recording-amplitude-bar-width')
      .replace('px', '');
    const barGap = +getComputedStyle(this.container.nativeElement)
      .getPropertyValue('--str-chat__voice-recording-amplitude-bar-gap-width')
      .replace('px', '');
    if (!isNaN(barWidth) && !isNaN(barGap)) {
      const sampleSize = Math.floor(containerWidth / (barWidth + barGap));
      if (
        sampleSize !== this.sampleSize &&
        !isNaN(sampleSize) &&
        sampleSize !== Infinity
      ) {
        this.ngZone.run(() => {
          this.sampleSize = sampleSize;
          this.resampledWaveFormData = resampleWaveForm(
            this.waveFormData,
            this.sampleSize
          );
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        });
      }
    }
  }
}

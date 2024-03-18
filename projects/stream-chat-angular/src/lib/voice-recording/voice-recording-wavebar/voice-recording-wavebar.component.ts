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
      this.resampledWaveFormData =
        this.waveFormData.length > this.sampleSize
          ? this.downsample()
          : this.upsample();
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

  seek(event: any) {
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
          this.resampledWaveFormData =
            this.waveFormData.length > this.sampleSize
              ? this.downsample()
              : this.upsample();
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        });
      }
    }
  }

  private downsample() {
    if (this.waveFormData.length <= this.sampleSize) {
      return this.waveFormData;
    }

    if (this.sampleSize === 1) return [this.mean(this.waveFormData)];

    const result: number[] = [];
    // bucket size adjusted due to the fact that the first and the last item in the original data array is kept in target output
    const bucketSize = (this.waveFormData.length - 2) / (this.sampleSize - 2);
    let lastSelectedPointIndex = 0;
    result.push(this.waveFormData[lastSelectedPointIndex]); // Always add the first point
    let maxAreaPoint, maxArea, triangleArea;

    for (
      let bucketIndex = 1;
      bucketIndex < this.sampleSize - 1;
      bucketIndex++
    ) {
      const previousBucketRefPoint = this.waveFormData[lastSelectedPointIndex];
      const nextBucketMean = this.getNextBucketMean(
        this.waveFormData,
        bucketIndex,
        bucketSize
      );

      const currentBucketStartIndex =
        Math.floor((bucketIndex - 1) * bucketSize) + 1;
      const nextBucketStartIndex = Math.floor(bucketIndex * bucketSize) + 1;
      const countUnitsBetweenAtoC =
        1 + nextBucketStartIndex - currentBucketStartIndex;

      maxArea = triangleArea = -1;

      for (
        let currentPointIndex = currentBucketStartIndex;
        currentPointIndex < nextBucketStartIndex;
        currentPointIndex++
      ) {
        const countUnitsBetweenAtoB =
          Math.abs(currentPointIndex - currentBucketStartIndex) + 1;
        const countUnitsBetweenBtoC =
          countUnitsBetweenAtoC - countUnitsBetweenAtoB;
        const currentPointValue = this.waveFormData[currentPointIndex];

        triangleArea = this.triangleAreaHeron(
          this.triangleBase(
            Math.abs(previousBucketRefPoint - currentPointValue),
            countUnitsBetweenAtoB
          ),
          this.triangleBase(
            Math.abs(currentPointValue - nextBucketMean),
            countUnitsBetweenBtoC
          ),
          this.triangleBase(
            Math.abs(previousBucketRefPoint - nextBucketMean),
            countUnitsBetweenAtoC
          )
        );

        if (triangleArea > maxArea) {
          maxArea = triangleArea;
          maxAreaPoint = this.waveFormData[currentPointIndex];
          lastSelectedPointIndex = currentPointIndex;
        }
      }

      if (typeof maxAreaPoint !== 'undefined') result.push(maxAreaPoint);
    }

    result.push(this.waveFormData[this.waveFormData.length - 1]); // Always add the last point

    return result;
  }

  private upsample = () => {
    if (this.sampleSize === this.waveFormData.length) return this.waveFormData;

    // eslint-disable-next-line  prefer-const
    let [bucketSize, remainder] = this.divMod(
      this.sampleSize,
      this.waveFormData.length
    );
    const result: number[] = [];

    for (let i = 0; i < this.waveFormData.length; i++) {
      const extra = remainder && remainder-- ? 1 : 0;
      result.push(...Array(bucketSize + extra).fill(this.waveFormData[i]));
    }
    return result;
  };

  private getNextBucketMean = (
    data: number[],
    currentBucketIndex: number,
    bucketSize: number
  ) => {
    const nextBucketStartIndex =
      Math.floor(currentBucketIndex * bucketSize) + 1;
    let nextNextBucketStartIndex =
      Math.floor((currentBucketIndex + 1) * bucketSize) + 1;
    nextNextBucketStartIndex =
      nextNextBucketStartIndex < data.length
        ? nextNextBucketStartIndex
        : data.length;

    return this.mean(
      data.slice(nextBucketStartIndex, nextNextBucketStartIndex)
    );
  };

  private mean = (values: number[]) =>
    values.reduce((acc, value) => acc + value, 0) / values.length;

  private triangleAreaHeron = (a: number, b: number, c: number) => {
    const s = (a + b + c) / 2;
    return Math.sqrt(s * (s - a) * (s - b) * (s - c));
  };

  private triangleBase = (a: number, b: number) =>
    Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));

  private divMod = (num: number, divisor: number) => {
    return [Math.floor(num / divisor), num % divisor];
  };
}

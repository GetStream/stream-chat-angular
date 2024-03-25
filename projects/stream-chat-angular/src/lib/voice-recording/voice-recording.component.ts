import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Attachment } from 'stream-chat';
import { DefaultStreamChatGenerics } from '../types';
import prettybytes from 'pretty-bytes';

/**
 * This component can be used to display an attachment with type `voiceRecording`. The component allows playing the attachment inside the browser.
 */
@Component({
  selector: 'stream-voice-recording',
  templateUrl: './voice-recording.component.html',
  styles: [],
})
export class VoiceRecordingComponent implements OnChanges, AfterViewInit {
  /**
   * The voice recording attachment
   */
  @Input() attachment?: Attachment<DefaultStreamChatGenerics>;
  fileSize: string = '';
  secondsElapsedFormatted: string;
  durationFormatted: string = '';
  secondsElapsed = 0;
  isError = false;
  @ViewChild('audioElement')
  private audioElement?: ElementRef<HTMLAudioElement>;

  constructor(private ngZone: NgZone, private cdRef: ChangeDetectorRef) {
    this.secondsElapsedFormatted = this.getFormattedDuration(
      this.secondsElapsed
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.attachment) {
      this.fileSize = this.getFileSize();
      this.durationFormatted = this.getFormattedDuration(
        this.attachment?.duration
      );
    }
  }

  ngAfterViewInit(): void {
    // timeupdate fired frequntly so we optimize change detections
    this.ngZone.runOutsideAngular(() => {
      this.audioElement?.nativeElement.addEventListener('timeupdate', () => {
        const secondsElapsed = this.audioElement?.nativeElement?.ended
          ? this.attachment?.duration || 0
          : Math.round(this.audioElement?.nativeElement?.currentTime || 0);
        if (this.secondsElapsed !== secondsElapsed) {
          this.ngZone.run(() => {
            this.secondsElapsed = secondsElapsed;
            this.secondsElapsedFormatted = this.getFormattedDuration(
              this.secondsElapsed
            );
            this.cdRef.detectChanges();
          });
        }
      });
    });
  }

  async togglePlay() {
    if (!this.audioElement || !this.attachment?.asset_url) {
      return;
    }
    try {
      this.audioElement?.nativeElement.paused
        ? await this.audioElement.nativeElement.play()
        : this.audioElement.nativeElement.pause();
      this.isError = false;
    } catch (e) {
      this.isError = true;
    }
  }

  setPlaybackRate() {
    if (!this.audioElement?.nativeElement) {
      return;
    }
    let playbackRate = this.audioElement?.nativeElement?.playbackRate + 0.5;
    if (playbackRate > 2) {
      playbackRate = 1;
    }
    this.audioElement.nativeElement.playbackRate = playbackRate;
  }

  private getFormattedDuration(duration?: number) {
    if (duration === undefined || duration <= 0) return '00:00';

    const [hours, hoursLeftover] = this.divMod(duration, 3600);
    const [minutes, seconds] = this.divMod(hoursLeftover, 60);
    const roundedSeconds = Math.ceil(seconds);

    const prependHrsZero = hours.toString().length === 1 ? '0' : '';
    const prependMinZero = minutes.toString().length === 1 ? '0' : '';
    const prependSecZero = roundedSeconds.toString().length === 1 ? '0' : '';
    const minSec = `${prependMinZero}${minutes}:${prependSecZero}${roundedSeconds}`;

    return hours ? `${prependHrsZero}${hours}:` + minSec : minSec;
  }

  private getFileSize() {
    if (
      this.attachment?.file_size === undefined ||
      this.attachment?.file_size === null
    ) {
      return '';
    }
    return prettybytes(Number(this.attachment.file_size || 0));
  }

  private divMod(num: number, divisor: number) {
    return [Math.floor(num / divisor), num % divisor];
  }
}

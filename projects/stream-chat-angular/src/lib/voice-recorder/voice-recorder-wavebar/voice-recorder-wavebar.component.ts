import { Component, OnDestroy } from '@angular/core';
import { AmplitudeRecorderService } from '../amplitude-recorder.service';
import { Observable } from 'rxjs';
import { AudioRecorderService } from '../audio-recorder.service';
import { formatDuration } from '../../format-duration';

/**
 * The `VoiceRecorderWavebarComponent` displays the amplitudes of the recording while the recoding is in progress
 */
@Component({
  selector: 'stream-voice-recorder-wavebar',
  templateUrl: './voice-recorder-wavebar.component.html',
  styles: [],
})
export class VoiceRecorderWavebarComponent implements OnDestroy {
  amplitudes$: Observable<number[]>;
  formattedDuration: string;
  durationComputeInterval: ReturnType<typeof setInterval>;
  isLongerThanOneHour = false;

  constructor(
    private amplitudeRecorder: AmplitudeRecorderService,
    private audioRecorder: AudioRecorderService,
  ) {
    this.amplitudes$ = this.amplitudeRecorder.amplitudes$;
    this.formattedDuration = formatDuration(
      this.audioRecorder.durationMs / 1000,
    );
    this.durationComputeInterval = setInterval(() => {
      this.isLongerThanOneHour = this.audioRecorder.durationMs / 1000 > 3600;
      this.formattedDuration = formatDuration(
        this.audioRecorder.durationMs / 1000,
      );
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.durationComputeInterval);
  }
}

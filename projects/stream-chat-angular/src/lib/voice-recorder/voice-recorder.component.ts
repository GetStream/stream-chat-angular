import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { AudioRecorderService } from './audio-recorder.service';
import { MediaRecordingState } from './media-recorder';
import { Subscription } from 'rxjs';
import { AudioRecording } from '../types';
import { VoiceRecorderService } from '../message-input/voice-recorder.service';

/**
 * The `VoiceRecorderComponent` makes it possible to record audio, and then upload it as a voice recording attachment
 */
@Component({
  selector: 'stream-voice-recorder',
  templateUrl: './voice-recorder.component.html',
  styles: [],
  providers: [],
})
export class VoiceRecorderComponent implements OnInit, OnDestroy, OnChanges {
  @Input() voiceRecorderService?: VoiceRecorderService;
  recordState: MediaRecordingState = MediaRecordingState.STOPPED;
  isLoading = false;
  recording?: AudioRecording;
  readonly MediaRecordingState = MediaRecordingState;
  private subscriptions: Subscription[] = [];
  private isVisibleSubscription?: Subscription;

  constructor(public readonly recorder: AudioRecorderService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.recorder.recordingState$.subscribe((s) => {
        this.recordState = s;
        if (this.recordState === MediaRecordingState.ERROR) {
          this.voiceRecorderService?.isRecorderVisible$.next(false);
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.voiceRecorderService && this.voiceRecorderService) {
      this.isVisibleSubscription =
        this.voiceRecorderService.isRecorderVisible$.subscribe((isVisible) => {
          if (!isVisible) {
            this.recording = undefined;
            this.isLoading = false;
          }
        });
    } else {
      this.isVisibleSubscription?.unsubscribe();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  cancel() {
    if (this.recording) {
      this.recording = undefined;
    } else {
      void this.recorder.stop({ cancel: true });
    }
    this.voiceRecorderService?.isRecorderVisible$.next(false);
  }

  async stop() {
    this.recording = await this.recorder.stop();
  }

  pause() {
    this.recorder.pause();
  }

  resume() {
    this.recorder.resume();
  }

  uploadRecording() {
    if (!this.recording) {
      return;
    }
    this.isLoading = true;
    this.voiceRecorderService?.recording$.next(this.recording);
  }
}

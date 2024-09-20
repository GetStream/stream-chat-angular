import { Injectable, NgModule } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AudioRecording } from '../types';

/**
 * The `VoiceRecorderService` provides a commincation outlet between the message input and voice recorder components.
 */
@Injectable({
  providedIn: NgModule,
})
export class VoiceRecorderService {
  /**
   * Use this property to get/set if the recording component should be visible
   */
  isRecorderVisible$ = new BehaviorSubject<boolean>(false);
  /**
   * The audio recording that was created
   */
  recording$ = new BehaviorSubject<AudioRecording | undefined>(undefined);

  constructor() {}
}

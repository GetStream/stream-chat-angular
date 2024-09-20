import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceRecorderComponent } from './voice-recorder.component';
import { VoiceRecordingModule } from '../voice-recording/voice-recording.module';
import { IconModule } from '../icon/icon.module';
import { TranslateModule } from '@ngx-translate/core';
import { AudioRecorderService } from './audio-recorder.service';
import { TranscoderService } from './transcoder.service';
import { AmplitudeRecorderService } from './amplitude-recorder.service';
import { VoiceRecorderWavebarComponent } from './voice-recorder-wavebar/voice-recorder-wavebar.component';

@NgModule({
  declarations: [VoiceRecorderComponent, VoiceRecorderWavebarComponent],
  imports: [CommonModule, VoiceRecordingModule, IconModule, TranslateModule],
  exports: [VoiceRecorderComponent, VoiceRecorderWavebarComponent],
  providers: [
    AudioRecorderService,
    TranscoderService,
    AmplitudeRecorderService,
  ],
})
export class VoiceRecorderModule {}

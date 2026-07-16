import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceRecordingComponent } from './voice-recording.component';
import { VoiceRecordingWavebarComponent } from './voice-recording-wavebar/voice-recording-wavebar.component';
import { IconModule } from '../icon/icon.module';
import { TranslatePipe } from '@ngx-translate/core';

@NgModule({
  declarations: [VoiceRecordingComponent, VoiceRecordingWavebarComponent],
  imports: [CommonModule, IconModule, TranslatePipe],
  exports: [VoiceRecordingComponent, VoiceRecordingWavebarComponent],
})
export class VoiceRecordingModule {}

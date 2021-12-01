import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from './avatar/avatar.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [AvatarComponent],
  imports: [CommonModule, TranslateModule],
  exports: [AvatarComponent],
})
export class StreamAvatarModule {}

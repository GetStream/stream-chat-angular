import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from './avatar/avatar.component';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { AvatarPlaceholderComponent } from './avatar-placeholder/avatar-placeholder.component';

@NgModule({
  declarations: [AvatarComponent, AvatarPlaceholderComponent],
  imports: [CommonModule, TranslateDirective, TranslatePipe],
  exports: [AvatarComponent, AvatarPlaceholderComponent],
})
export class StreamAvatarModule {}

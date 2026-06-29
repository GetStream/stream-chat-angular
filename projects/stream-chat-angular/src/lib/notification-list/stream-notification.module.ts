import { NgModule } from '@angular/core';
import { NotificationListComponent } from './notification-list.component';
import { NotificationComponent } from '../notification/notification.component';
import { CommonModule } from '@angular/common';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';

@NgModule({
  declarations: [NotificationComponent, NotificationListComponent],
  imports: [CommonModule, TranslateDirective, TranslatePipe],
  exports: [NotificationComponent, NotificationListComponent],
})
export class StreamNotificationModule {}

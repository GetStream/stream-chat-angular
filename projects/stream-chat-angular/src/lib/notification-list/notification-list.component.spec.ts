import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationService } from '../notification.service';
import { NotificationComponent } from '../notification/notification.component';

import { NotificationListComponent } from './notification-list.component';

describe('NotificationListComponent', () => {
  let fixture: ComponentFixture<NotificationListComponent>;
  let queryNotificationComponents: () => NotificationComponent[];
  let queryNotificationContents: () => HTMLElement[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [NotificationListComponent, NotificationComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationListComponent);
    fixture.detectChanges();
    queryNotificationComponents = () =>
      fixture.debugElement
        .queryAll(By.directive(NotificationComponent))
        .map((el) => el.componentInstance as NotificationComponent);
    queryNotificationContents = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '[data-testclass="notification-content"]'
        )
      );
  });

  it('should display notifications', () => {
    const service = TestBed.inject(NotificationService);
    service.addTemporaryNotification('streamChat.Message flaged', 'success');
    service.addPermanentNotification('streamChat.Connection failure', 'error');
    fixture.detectChanges();
    const notificationComponents = queryNotificationComponents();
    const notificationContents = queryNotificationContents();

    expect(notificationComponents.length).toBe(2);
    expect(notificationComponents[0].type).toBe('success');
    expect(notificationComponents[1].type).toBe('error');
    expect(notificationContents[0].innerHTML).toContain('Message flaged');
    expect(notificationContents[1].innerHTML).toContain('Connection failure');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationService } from '../notification.service';
import { NotificationComponent } from '../notification/notification.component';
import { ThemeService } from '../theme.service';

import { NotificationListComponent } from './notification-list.component';

describe('NotificationListComponent', () => {
  let fixture: ComponentFixture<NotificationListComponent>;
  let queryNotificationComponents: () => NotificationComponent[];
  let queryNotificationContents: () => HTMLElement[];
  let queryContainer: () => HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [ThemeService],
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
    queryContainer = () =>
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="notification-list"]'
      ) as HTMLElement;
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

  it('should apply dark/light theme', () => {
    const service = TestBed.inject(ThemeService);
    const lightClass = 'str-chat__theme-light';
    const darkClass = 'str-chat__theme-dark';
    const container = queryContainer();
    fixture.detectChanges();

    expect(container?.classList.contains(lightClass)).toBeTrue();
    expect(container?.classList.contains(darkClass)).toBeFalse();

    service.theme$.next('dark');
    fixture.detectChanges();

    expect(container?.classList.contains(darkClass)).toBeTrue();
  });
});

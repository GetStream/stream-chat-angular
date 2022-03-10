import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationComponent } from './notification.component';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;
  let nativeElement: HTMLElement;
  let queryNotification: () => HTMLElement | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NotificationComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    nativeElement = fixture.nativeElement as HTMLElement;
    queryNotification = () =>
      nativeElement.querySelector('[data-testid="custom-notification"]');
  });

  it('should add dynamic CSS class if type is error', () => {
    component.type = 'error';
    fixture.detectChanges();

    expect(
      queryNotification()?.classList.contains('notification-error')
    ).toBeTrue();
  });

  it('should add dynamic CSS class if type is success', () => {
    component.type = 'success';
    fixture.detectChanges();
    const notificationElement = queryNotification();

    expect(
      notificationElement?.classList.contains('notification-success')
    ).toBeTrue();

    expect(
      notificationElement?.classList.contains('notification-error')
    ).toBeFalse();
  });

  it('should add dynamic CSS class if type is info', () => {
    component.type = 'info';
    fixture.detectChanges();

    expect(
      queryNotification()?.classList.contains('notification-info')
    ).toBeTrue();
  });
});

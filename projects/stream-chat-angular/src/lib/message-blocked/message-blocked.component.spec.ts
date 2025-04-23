import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MessageBlockedComponent } from './message-blocked.component';
import { ChangeDetectionStrategy } from '@angular/core';

describe('MessageBlockedComponent', () => {
  let component: MessageBlockedComponent;
  let fixture: ComponentFixture<MessageBlockedComponent>;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [MessageBlockedComponent],
    })
      .overrideComponent(MessageBlockedComponent, {
        set: { changeDetection: ChangeDetectionStrategy.Default },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageBlockedComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the blocked message text', () => {
    const blockedMessageElement = nativeElement.querySelector(
      '[data-testid="message-blocked-component"]'
    );
    expect(blockedMessageElement).not.toBeNull();
    expect(blockedMessageElement?.textContent?.trim()).toContain(
      'streamChat.Message was blocked by moderation policies'
    );
  });

  it('should apply "me" classes when isMyMessage is true', () => {
    component.isMyMessage = true;
    fixture.detectChanges();

    const messageElement = nativeElement.querySelector(
      '[data-testid="message-blocked-component"]'
    );
    expect(
      messageElement?.classList.contains('str-chat__message--me')
    ).toBeTrue();
    expect(
      messageElement?.classList.contains('str-chat__message-simple--me')
    ).toBeTrue();
    expect(
      messageElement?.classList.contains('str-chat__message--other')
    ).toBeFalse();
  });

  it('should apply "other" class when isMyMessage is false', () => {
    component.isMyMessage = false;
    fixture.detectChanges();

    const messageElement = nativeElement.querySelector(
      '[data-testid="message-blocked-component"]'
    );
    expect(
      messageElement?.classList.contains('str-chat__message--me')
    ).toBeFalse();
    expect(
      messageElement?.classList.contains('str-chat__message-simple--me')
    ).toBeFalse();
    expect(
      messageElement?.classList.contains('str-chat__message--other')
    ).toBeTrue();
  });
});

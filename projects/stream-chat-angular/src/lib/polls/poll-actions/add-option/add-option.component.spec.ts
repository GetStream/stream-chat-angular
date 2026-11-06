import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Poll, StreamAPIError } from 'stream-chat';
import { ChatClientService } from '../../../chat-client.service';
import { ChannelService } from '../../../channel.service';
import { NotificationService } from '../../../notification.service';
import { MockStateStore } from '../../../mocks';
import { AddOptionComponent } from './add-option.component';

describe('AddOptionComponent', () => {
  let component: AddOptionComponent;
  let fixture: ComponentFixture<AddOptionComponent>;
  let pollCache: Map<string, Poll>;
  let createOption: jasmine.Spy;

  beforeEach(async () => {
    createOption = jasmine.createSpy('createOption');
    pollCache = new Map([
      [
        'poll-1',
        {
          id: 'poll-1',
          state: new MockStateStore({ options: [{ id: '1', text: 'Red' }] }),
          createOption,
        } as unknown as Poll,
      ],
    ]);
    await TestBed.configureTestingModule({
      declarations: [AddOptionComponent],
      imports: [TranslateModule.forRoot(), ReactiveFormsModule],
      providers: [
        {
          provide: ChatClientService,
          useValue: {
            chatClient: {
              polls: { fromState: (id: string) => pollCache.get(id) },
              user: { id: 'me' },
            },
          },
        },
        {
          provide: ChannelService,
          useValue: { activeChannel$: new BehaviorSubject(undefined) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddOptionComponent);
    component = fixture.componentInstance;
    component.pollId = 'poll-1';
    component.messageId = 'message-1';
    component.ngOnChanges({
      pollId: new SimpleChange(undefined, 'poll-1', true),
    });
    fixture.detectChanges();
  });

  it('should display error notification with the error message if option could not be added', async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    const closeModal = jasmine.createSpy('closeModal');
    component.closeModal = closeModal;
    component.formGroup.get('text')!.setValue('Blue');
    const message =
      'CreatePollOption failed with error: "poll option with the same text already exists"';
    const error = new StreamAPIError(message, {
      code: 4,
      status: 400,
      response: {
        data: { code: 4, message, StatusCode: 400 },
        status: 400,
      } as unknown as StreamAPIError['response'],
    });
    createOption.and.rejectWith(error);

    await expectAsync(component.addOption()).toBeRejectedWith(error);

    expect(createOption).toHaveBeenCalledWith({ text: 'Blue' });
    expect(closeModal).not.toHaveBeenCalled();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Failed to add option ({{ message }})',
      'error',
      undefined,
      { message }
    );
  });
});

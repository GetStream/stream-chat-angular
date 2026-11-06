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
import { UpsertAnswerComponent } from './upsert-answer.component';

describe('UpsertAnswerComponent', () => {
  let component: UpsertAnswerComponent;
  let fixture: ComponentFixture<UpsertAnswerComponent>;
  let pollCache: Map<string, Poll>;
  let addAnswer: jasmine.Spy;

  beforeEach(async () => {
    addAnswer = jasmine.createSpy('addAnswer');
    pollCache = new Map([
      [
        'poll-1',
        {
          id: 'poll-1',
          state: new MockStateStore({}),
          addAnswer,
        } as unknown as Poll,
      ],
    ]);
    await TestBed.configureTestingModule({
      declarations: [UpsertAnswerComponent],
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

    fixture = TestBed.createComponent(UpsertAnswerComponent);
    component = fixture.componentInstance;
    component.pollId = 'poll-1';
    component.messageId = 'message-1';
    component.ngOnChanges({
      pollId: new SimpleChange(undefined, 'poll-1', true),
    });
    fixture.detectChanges();
  });

  it('should display error notification if comment could not be added', async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    const closeModal = jasmine.createSpy('closeModal');
    component.closeModal = closeModal;
    component.formGroup.get('comment')!.setValue('My comment');
    const message = 'CastPollVote failed with error: "error"';
    const error = new StreamAPIError(message, {
      code: 4,
      status: 400,
      response: {
        data: { code: 4, message, StatusCode: 400 },
        status: 400,
      } as unknown as StreamAPIError['response'],
    });
    addAnswer.and.rejectWith(error);

    await expectAsync(component.addComment()).toBeRejectedWith(error);

    expect(addAnswer).toHaveBeenCalledWith('My comment', 'message-1');
    expect(closeModal).not.toHaveBeenCalled();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Failed to add comment'
    );
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { StreamAPIError } from 'stream-chat';
import { ChatClientService } from '../../chat-client.service';
import { NotificationService } from '../../notification.service';
import { PollComposerComponent } from './poll-composer.component';

describe('PollComposerComponent', () => {
  let component: PollComposerComponent;
  let fixture: ComponentFixture<PollComposerComponent>;
  let createPoll: jasmine.Spy;

  beforeEach(async () => {
    createPoll = jasmine.createSpy('createPoll');
    await TestBed.configureTestingModule({
      declarations: [PollComposerComponent],
      imports: [TranslateModule.forRoot(), ReactiveFormsModule],
      providers: [
        {
          provide: ChatClientService,
          useValue: { chatClient: { polls: { createPoll } } },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PollComposerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should display error notification if poll could not be created', async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    const pollComposeSpy = jasmine.createSpy();
    component.pollCompose.subscribe(pollComposeSpy);
    component.formGroup.get('name')!.setValue('Favourite colour');
    component.options.at(0).setValue('Red');
    const message = 'CreatePoll failed with error: "error"';
    const error = new StreamAPIError(message, {
      code: 4,
      status: 400,
      response: {
        data: { code: 4, message, StatusCode: 400 },
        status: 400,
      } as unknown as StreamAPIError['response'],
    });
    createPoll.and.rejectWith(error);

    await expectAsync(component.createPoll()).toBeRejectedWith(error);

    expect(createPoll).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'Favourite colour',
        options: [{ text: 'Red' }],
      })
    );
    expect(pollComposeSpy).not.toHaveBeenCalled();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Failed to create poll'
    );
  });
});

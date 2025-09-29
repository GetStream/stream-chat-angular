import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Poll, PollAnswer } from 'stream-chat';
import { BasePollComponent } from '../../base-poll.component';

/**
 *
 */
@Component({
  selector: 'stream-upsert-answer',
  templateUrl: './upsert-answer.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertAnswerComponent
  extends BasePollComponent
  implements OnChanges
{
  @HostBinding('class') class = 'str-chat__dialog';
  /**
   * The poll comment to edit, when in edit mode
   */
  @Input() answer: PollAnswer | undefined;
  /**
   * The callback to close the modal the component is displayed in
   */
  @Input() closeModal: () => void = () => {};
  formGroup = new FormGroup({
    comment: new FormControl('', [Validators.required]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes['answer']) {
      this.formGroup.get('comment')?.setValue(this.answer?.answer_text ?? '');
    }
  }

  async addComment() {
    if (this.formGroup.invalid || !this.messageId) {
      return;
    }
    try {
      await this.poll?.addAnswer(this.formGroup.value.comment!, this.messageId);
      this.closeModal();
      this.markForCheck();
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Failed to add comment'
      );
      this.markForCheck();
      throw error;
    }
  }

  protected stateStoreSelector(_: Poll, __: () => void): () => void {
    return () => {};
  }
}

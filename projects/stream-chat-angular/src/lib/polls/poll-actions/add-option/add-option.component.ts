import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BasePollComponent } from '../../base-poll.component';
import { Poll, PollOption } from 'stream-chat';
import { createUniqueValidator } from '../../unique.validator';

/**
 *
 */
@Component({
  selector: 'stream-add-option',
  templateUrl: './add-option.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddOptionComponent extends BasePollComponent {
  @HostBinding('class') class = 'str-chat__dialog';
  /**
   * The callback to close the modal the component is displayed in
   */
  @Input() closeModal: () => void = () => {};
  formGroup = new FormGroup({
    text: new FormControl('', [
      Validators.required,
      createUniqueValidator((value) => {
        return !this.options.some(
          (option) =>
            option.text.trim().toLowerCase() === value.trim().toLowerCase()
        );
      }),
    ]),
  });
  options: PollOption[] = [];

  async addOption() {
    if (this.formGroup.invalid || !this.messageId) {
      return;
    }
    try {
      await this.poll?.createOption({
        text: this.formGroup.value.text!,
      });
      this.closeModal();
      this.markForCheck();
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Failed to add option ({{ message }})',
        'error',
        undefined,
        { message: error }
      );
      this.markForCheck();
      throw error;
    }
  }

  protected stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void {
    const unsubscribe = poll.state.subscribeWithSelector(
      (state) => ({
        options: state.options,
      }),
      (state) => {
        this.options = state.options;
        markForCheck();
      }
    );

    return unsubscribe;
  }
}

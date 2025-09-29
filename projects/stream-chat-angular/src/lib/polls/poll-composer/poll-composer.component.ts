import {
  Component,
  EventEmitter,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { VotingVisibility } from 'stream-chat';
import { CustomTemplatesService } from '../../custom-templates.service';
import { ModalContext } from '../../types';
import { ChatClientService } from '../../chat-client.service';
import { NotificationService } from '../../notification.service';
import { atLeastOneOption, maximumNumberOfVotes } from './validators';

/**
 *
 */
@Component({
  selector: 'stream-poll-composer',
  templateUrl: './poll-composer.component.html',
  styles: [],
})
export class PollComposerComponent {
  /**
   * Emitted when a poll is created, the poll id is emitted
   */
  @Output() pollCompose = new EventEmitter<string>();
  /**
   * Emitted when the poll composing is cancelled
   */
  @Output() cancel = new EventEmitter<void>();
  formGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    options: new FormArray<FormControl<string | null>>(
      [new FormControl<string | null>('')],
      [atLeastOneOption()]
    ),
    multiple_answers: new FormControl(false),
    maximum_number_of_votes: new FormControl(null, [
      Validators.min(2),
      Validators.max(10),
    ]),
    is_anonymous: new FormControl(false),
    allow_user_suggested_options: new FormControl(false),
    allow_answers: new FormControl(false),
  });
  isModalOpen = true;
  @ViewChild('formContent') private formContent!: TemplateRef<void>;

  constructor(
    readonly customTemplatesService: CustomTemplatesService,
    private chatService: ChatClientService,
    private notificationService: NotificationService
  ) {
    this.formGroup
      .get('maximum_number_of_votes')
      ?.addValidators([
        maximumNumberOfVotes(
          this.formGroup.get('multiple_answers') as FormControl<boolean>
        ),
      ]);
    this.formGroup.get('maximum_number_of_votes')?.disable();
    this.formGroup.valueChanges.subscribe((value) => {
      if (
        value.multiple_answers &&
        this.formGroup.get('maximum_number_of_votes')?.disabled
      ) {
        this.formGroup.get('maximum_number_of_votes')?.enable();
      } else if (
        !value.multiple_answers &&
        this.formGroup.get('maximum_number_of_votes')?.enabled
      ) {
        this.formGroup.get('maximum_number_of_votes')?.disable();
      }
    });
  }

  optionChanged(index: number) {
    const control = this.options.at(index);
    const penultimateIndex = this.options.length - 2;
    if (index === this.options.length - 1 && control.value?.length === 1) {
      this.addOption();
    } else if (
      index === penultimateIndex &&
      control.value?.length === 0 &&
      this.options.at(this.options.length - 1).value?.length === 0
    ) {
      this.removeLastOption();
    }
  }

  get options() {
    return this.formGroup.get('options') as FormArray<
      FormControl<string | null>
    >;
  }

  addOption() {
    const control = new FormControl<string | null>('', []);
    this.options.push(control);
  }

  removeLastOption() {
    this.options.removeAt(this.options.length - 1);
  }

  getModalContext(): ModalContext {
    return {
      isOpen: this.isModalOpen,
      isOpenChangeHandler: (isOpen: boolean) => {
        if (!isOpen) {
          this.cancel.emit();
        }
        this.isModalOpen = isOpen;
      },
      content: this.formContent,
    };
  }

  async createPoll() {
    try {
      const maxVotesControl = this.formGroup.get('maximum_number_of_votes');
      const response = await this.chatService.chatClient.polls.createPoll({
        name: this.formGroup.get('name')!.value!,
        options: this.formGroup
          .get('options')!
          .value.filter((v) => !!v)
          .map((v) => ({ text: v! })),
        enforce_unique_vote: !this.formGroup.get('multiple_answers')?.value,
        max_votes_allowed: maxVotesControl?.value
          ? +maxVotesControl.value
          : undefined,
        voting_visibility: this.formGroup.get('is_anonymous')?.value
          ? VotingVisibility.anonymous
          : VotingVisibility.public,
        allow_user_suggested_options: !!this.formGroup.get(
          'allow_user_suggested_options'
        )?.value,
        allow_answers: !!this.formGroup.get('allow_answers')?.value,
      });
      this.pollCompose.emit(response?.id);
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Failed to create poll'
      );
      throw error;
    }
  }
}

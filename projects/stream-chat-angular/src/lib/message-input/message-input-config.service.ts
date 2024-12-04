import { Injectable } from '@angular/core';
import { MessageInputComponent } from './message-input.component';
import { BehaviorSubject } from 'rxjs';
import { CustomAutocomplete } from '../types';

/**
 * The `MessageInputConfigService` is used to keep a consistent configuration among the different [`MessageInput`](/chat/docs/sdk/angular/components/MessageInputComponent/) components if your UI has more than one input component.
 */
@Injectable({
  providedIn: 'root',
})
export class MessageInputConfigService {
  /**
   * If file upload is enabled, the user can open a file selector from the input. Please note that the user also needs to have the necessary [channel capability](https://getstream.io/chat/docs/javascript/channel_capabilities/?language=javascript).
   */
  isFileUploadEnabled: boolean | undefined = true;
  /**
   * If true, users can mention other users in messages. You also [need to use the `AutocompleteTextarea`](/chat/docs/sdk/angular/concepts/opt-in-architecture/) for this feature to work.
   */
  areMentionsEnabled: boolean | undefined = true;
  /**
   * If `false`, users can only upload one attachment per message
   */
  isMultipleFileUploadEnabled: boolean | undefined = true;
  /**
   * The scope for user mentions, either members of the current channel of members of the application
   */
  mentionScope: 'channel' | 'application' | undefined = 'channel';
  /**
   * In `desktop` mode the `Enter` key will trigger message sending, in `mobile` mode the `Enter` key will insert a new line to the message input.
   */
  inputMode: 'desktop' | 'mobile' = 'desktop';
  /**
   * If `true` the recording will be sent as a message immediately after the recording is completed.
   * If `false`, the recording will added to the attachment preview, and users can continue composing the message.
   */
  sendVoiceRecordingImmediately = true;
  /**
   * Override the message input's default event handler for [paste events](https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event)
   *
   * The event handler will receive the event object, and the [message input component](/chat/docs/sdk/angular/components/MessageInputComponent).
   *
   * You can use the public API of the message input component to update the composer. Typically you want to update the message text and/or attachments, this is how you can do these:
   * - Change message text: `inputComponent.textareaValue = '<new value>'`
   * - Upload file or image attachments: `inputComponent.attachmentService.filesSelected(<files>)`
   * - Upload custom attachments: `inputComponent.attachmentService.customAttachments$.next(<custom attachments>)`
   */
  customPasteEventHandler?: (
    event: ClipboardEvent,
    inputComponent: MessageInputComponent
  ) => void;
  /**
   * Add custom autocomplete configurations to the message input
   *
   * Only works when using StreamAutocompleteTextareaModule
   */
  customAutocompletes$ = new BehaviorSubject<CustomAutocomplete[]>([]);

  constructor() {}
}

import { Injectable } from '@angular/core';

/**
 * The `MessageInputConfigService` is used to keep a consistent configuration among the different [`MessageInput`](../components/MessageInputComponent.mdx) components if your UI has more than one input component.
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
   * If true, users can mention other users in messages. You also [need to use the `AutocompleteTextarea`](../concepts/opt-in-architecture.mdx) for this feature to work.
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

  constructor() {}
}

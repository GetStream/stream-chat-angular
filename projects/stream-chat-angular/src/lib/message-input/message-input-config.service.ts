import { Injectable, TemplateRef } from '@angular/core';
import {
  CommandAutocompleteListItemContext,
  MentionAutcompleteListItemContext,
} from '../types';

/**
 * The `MessageInputConfigService` is used to keep a consistent configuration among the different [`MessageInput`](../components/message-input.mdx) components if your UI has more than one input component.
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
   * You can provide your own template for the autocomplete list for user mentions. You also [need to use the `AutocompleteTextarea`](../concepts/opt-in-architecture.mdx) for this feature to work.
   */
  mentionAutocompleteItemTemplate:
    | TemplateRef<MentionAutcompleteListItemContext>
    | undefined;
  /**
   * You can provide your own template for the autocomplete list for commands. You also [need to use the `AutocompleteTextarea`](../concepts/opt-in-architecture.mdx) for this feature to work.
   */
  commandAutocompleteItemTemplate:
    | TemplateRef<CommandAutocompleteListItemContext>
    | undefined;
  /**
   * You can narrow the accepted file types by providing the [accepted types](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept). By default every file type is accepted.
   * @deprecated use [application settings](https://getstream.io/chat/docs/javascript/app_setting_overview/?language=javascript#file-uploads) instead
   */
  acceptedFileTypes: string[] | undefined;
  /**
   * If `false`, users can only upload one attachment per message
   */
  isMultipleFileUploadEnabled: boolean | undefined = true;
  /**
   * The scope for user mentions, either members of the current channel of members of the application
   */
  mentionScope: 'channel' | 'application' | undefined = 'channel';

  constructor() {}
}

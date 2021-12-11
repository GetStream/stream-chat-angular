import { Injectable, TemplateRef } from '@angular/core';
import { MentionAutcompleteListItemContext } from '../types';

@Injectable({
  providedIn: 'root',
})
export class MessageInputConfigService {
  isFileUploadEnabled: boolean | undefined = true;
  areMentionsEnabled: boolean | undefined = true;
  mentionAutocompleteItemTemplate:
    | TemplateRef<MentionAutcompleteListItemContext>
    | undefined;
  /**
   * @deprecated https://getstream.io/chat/docs/sdk/angular/services/message-input-config/#overview
   */
  acceptedFileTypes: string[] | undefined;
  isMultipleFileUploadEnabled: boolean | undefined = true;
  mentionScope: 'channel' | 'application' | undefined = 'channel';

  constructor() {}
}

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
  acceptedFileTypes: string[] | undefined;
  isMultipleFileUploadEnabled: boolean | undefined = true;
  mentionScope: 'channel' | 'application' | undefined = 'channel';

  constructor() {}
}

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MessageInputConfigService {
  isFileUploadEnabled: boolean | undefined = true;
  acceptedFileTypes: string[] | undefined;
  isMultipleFileUploadEnabled: boolean | undefined = true;

  constructor() {}
}

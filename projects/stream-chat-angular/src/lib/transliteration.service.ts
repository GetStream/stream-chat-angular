import { Injectable } from '@angular/core';
import transliterate from '@stream-io/transliterate';

@Injectable({ providedIn: 'root' })
export class TransliterationService {
  constructor() {}

  transliterate(s: string) {
    return transliterate(s);
  }
}

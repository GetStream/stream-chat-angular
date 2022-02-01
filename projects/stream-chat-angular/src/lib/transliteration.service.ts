import { Injectable } from '@angular/core';
import transliterate from '@stream-io/transliterate';

/**
 * The `TransliterationService` wraps the [@sindresorhus/transliterate](https://www.npmjs.com/package/@sindresorhus/transliterate) library
 */
@Injectable({ providedIn: 'root' })
export class TransliterationService {
  constructor() {}

  /**
   *
   * @param s the string to be transliterated
   * @returns the result of the transliteration
   */
  transliterate(s: string) {
    return transliterate(s);
  }
}

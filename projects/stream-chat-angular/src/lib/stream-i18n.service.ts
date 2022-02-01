import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { en } from '../assets/i18n/en';

/**
 * The `StreamI18nService` can be used to customize the labels of the chat UI. Our [translation guide](../concepts/translation.mdx) covers this topic in detail.
 */
@Injectable({
  providedIn: 'root',
})
export class StreamI18nService {
  constructor(private translteService: TranslateService) {}

  /**
   * Registers the translation to the [ngx-translate](https://github.com/ngx-translate/core) TranslateService.
   * @param lang The language key to register the translation to
   * @param overrides An object which keys are translation keys, and the values are custom translations
   */
  setTranslation(lang = 'en', overrides?: { [key: string]: string }) {
    if (!this.translteService.defaultLang) {
      this.translteService.defaultLang = lang;
    }
    this.translteService.setTranslation(
      lang,
      { streamChat: { ...en.streamChat, ...overrides } },
      true
    );
  }
}

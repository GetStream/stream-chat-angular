import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { en } from '../assets/i18n/en';

@Injectable({
  providedIn: 'root',
})
export class StreamI18nService {
  constructor(private translteService: TranslateService) {}

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

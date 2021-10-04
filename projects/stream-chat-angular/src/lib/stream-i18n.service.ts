import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { en } from '../assets/i18n/en';

@Injectable({
  providedIn: 'root',
})
export class StreamI18nService {
  constructor(private transalteService: TranslateService) {}

  init() {
    this.transalteService.setTranslation('en', en);
  }
}

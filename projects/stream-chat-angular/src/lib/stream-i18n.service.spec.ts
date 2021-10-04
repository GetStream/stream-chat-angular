import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { en } from '../assets/i18n/en';

import { StreamI18nService } from './stream-i18n.service';

describe('I18nService', () => {
  let service: StreamI18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
    });
    service = TestBed.inject(StreamI18nService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should init translations', () => {
    const translateService = TestBed.inject(TranslateService);
    spyOn(translateService, 'setTranslation');
    service.init();

    expect(translateService['setTranslation']).toHaveBeenCalledWith('en', en);
  });
});

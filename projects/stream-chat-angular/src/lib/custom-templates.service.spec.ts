import { TestBed } from '@angular/core/testing';

import { CustomTemplatesService } from './custom-templates.service';

describe('CustomTemplatesService', () => {
  let service: CustomTemplatesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomTemplatesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { MessageInputConfigService } from './message-input-config.service';

describe('MessageInputConfigService', () => {
  let service: MessageInputConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageInputConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { MessageActionsService } from './message-actions.service';

// Unit tests for these service are in the MessageActionsBox and Message components' test file
describe('MessageActionsService', () => {
  let service: MessageActionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageActionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

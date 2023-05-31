import { TestBed } from '@angular/core/testing';

import { MessageReactionsService } from './message-reactions.service';

describe('MessageReactionsService', () => {
  let service: MessageReactionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageReactionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

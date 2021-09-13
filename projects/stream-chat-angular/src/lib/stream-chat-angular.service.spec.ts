import { TestBed } from '@angular/core/testing';

import { StreamChatAngularService } from './stream-chat-angular.service';

describe('StreamChatAngularService', () => {
  let service: StreamChatAngularService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StreamChatAngularService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

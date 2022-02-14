import { TestBed } from '@angular/core/testing';

import { EmojiInputService } from './emoji-input.service';

describe('EmojiInputService', () => {
  let service: EmojiInputService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmojiInputService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

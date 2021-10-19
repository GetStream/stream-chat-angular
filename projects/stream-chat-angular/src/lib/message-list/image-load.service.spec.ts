import { TestBed } from '@angular/core/testing';

import { ImageLoadService } from './image-load.service';

describe('ImageLoadService', () => {
  let service: ImageLoadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageLoadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

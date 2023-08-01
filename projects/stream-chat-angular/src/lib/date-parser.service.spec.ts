import { TestBed } from '@angular/core/testing';

import { DateParserService } from './date-parser.service';

describe('DateParserService', () => {
  let service: DateParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DateParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should parse date', () => {
    const date = new Date();

    expect(service.parseDate(date)).toEqual('Today');
  });

  it('should parse date-time', () => {
    const date = new Date();

    expect(service.parseDateTime(date)).toContain('Today at');
  });

  it('should call custom date parser', () => {
    const date = new Date(2023, 7, 2);
    const spy = jasmine.createSpy();
    service.customDateParser = spy;

    service.parseDate(date);

    expect(spy).toHaveBeenCalledWith(date);
  });

  it('should call custom date-time', () => {
    const date = new Date(2023, 7, 2);
    const spy = jasmine.createSpy();
    service.customDateTimeParser = spy;

    service.parseDateTime(date);

    expect(spy).toHaveBeenCalledWith(date);
  });
});

import { Injectable } from '@angular/core';
import { parseDate } from './parse-date';

/**
 * The `DateParserService` parses dates into user-friendly string representations.
 */
@Injectable({
  providedIn: 'root',
})
export class DateParserService {
  /**
   * Custom parser to override `parseDate`
   */
  customDateParser?: (date: Date) => string;
  /**
   * Custom parser to override `parseDateTime`
   */
  customDateTimeParser?: (date: Date) => string;

  constructor() {}

  /**
   * Return a user-friendly string representation of the date (year, month and date)
   * @param date
   * @returns The parsed date
   */
  parseDate(date: Date) {
    if (this.customDateParser) {
      return this.customDateParser(date);
    }
    return parseDate(date, 'date');
  }

  /**
   * Return a user-friendly string representation of the date and time
   * @param date
   * @returns The parsed date
   */
  parseDateTime(date: Date) {
    if (this.customDateTimeParser) {
      return this.customDateTimeParser(date);
    }
    return parseDate(date, 'date-time');
  }
}

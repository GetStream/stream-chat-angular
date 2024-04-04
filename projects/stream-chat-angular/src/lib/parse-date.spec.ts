import { parseDate } from './parse-date';

describe('parseDate', () => {
  it('should parse date', () => {
    const today = new Date();
    today.setHours(16);
    today.setMinutes(3);

    expect(parseDate(today)).toEqual('Today at 4:03 PM');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(8);
    yesterday.setMinutes(15);

    expect(parseDate(yesterday)).toBe('Yesterday at 8:15 AM');

    const olderDate = new Date('2021-09-14T13:08:30.004112Z');

    expect(parseDate(olderDate)).toBe('09/14/2021');
  });

  it('should parse time', () => {
    const today = new Date();
    today.setHours(16);
    today.setMinutes(3);

    expect(parseDate(today, 'time')).toEqual('4:03 PM');
  });
});

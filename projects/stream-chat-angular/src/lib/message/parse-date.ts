import Dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';

Dayjs.extend(calendar);

export const parseDate = (date: Date) => {
  const parsedTime = Dayjs(date);

  return parsedTime.calendar();
};

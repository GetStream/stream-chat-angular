import Dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import relativeTime from 'dayjs/plugin/relativeTime';

Dayjs.extend(calendar);
Dayjs.extend(relativeTime);

export const parseDate = (
  date: Date,
  format: 'date' | 'date-time' = 'date-time'
) => {
  const parsedTime = Dayjs(date);

  return format === 'date-time'
    ? parsedTime.calendar()
    : parsedTime.calendar(null, {
        sameDay: '[Today]', // The same day ( Today at 2:30 AM )
        nextDay: '[Tomorrow]', // The next day ( Tomorrow at 2:30 AM )
        nextWeek: 'dddd', // The next week ( Sunday at 2:30 AM )
        lastDay: '[Yesterday]', // The day before ( Yesterday at 2:30 AM )
        lastWeek: '[Last] dddd', // Last week ( Last Monday at 2:30 AM )
        sameElse: 'MM/DD/YYYY', // Everything else ( 10/17/2011 )
      });
};

import Dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import relativeTime from 'dayjs/plugin/relativeTime';

Dayjs.extend(calendar);
Dayjs.extend(relativeTime);

export const parseDate = (
  date: Date,
  format: 'date' | 'date-time' | 'time' = 'date-time'
) => {
  const parsedTime = Dayjs(date);

  switch (format) {
    case 'date': {
      return parsedTime.calendar(null, {
        sameDay: '[Today]', // The same day ( Today at 2:30 AM )
        nextDay: '[Tomorrow]', // The next day ( Tomorrow at 2:30 AM )
        nextWeek: 'dddd', // The next week ( Sunday at 2:30 AM )
        lastDay: '[Yesterday]', // The day before ( Yesterday at 2:30 AM )
        lastWeek: '[Last] dddd', // Last week ( Last Monday at 2:30 AM )
        sameElse: 'MM/DD/YYYY', // Everything else ( 10/17/2011 )
      });
    }
    case 'date-time': {
      return parsedTime.calendar();
    }
    case 'time': {
      return parsedTime.format('h:mm A');
    }
  }
};

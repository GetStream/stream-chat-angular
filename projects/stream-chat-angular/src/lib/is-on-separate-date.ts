export const isOnSeparateDate = (date1: Date, date2: Date) => {
  if (date1.getDate() !== date2.getDate()) {
    return true;
  } else if (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth()
  ) {
    return true;
  }
  return false;
};

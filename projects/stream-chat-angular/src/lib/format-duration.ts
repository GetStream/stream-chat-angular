export const formatDuration = (durationInSeconds?: number) => {
  if (durationInSeconds === undefined || durationInSeconds <= 0) return '00:00';

  const [hours, hoursLeftover] = divMod(durationInSeconds, 3600);
  const [minutes, seconds] = divMod(hoursLeftover, 60);
  const roundedSeconds = Math.ceil(seconds);

  const prependHrsZero = hours.toString().length === 1 ? '0' : '';
  const prependMinZero = minutes.toString().length === 1 ? '0' : '';
  const prependSecZero = roundedSeconds.toString().length === 1 ? '0' : '';
  const minSec = `${prependMinZero}${minutes}:${prependSecZero}${roundedSeconds}`;

  return hours ? `${prependHrsZero}${hours}:` + minSec : minSec;
};

const divMod = (num: number, divisor: number) => {
  return [Math.floor(num / divisor), num % divisor];
};

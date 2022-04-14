import { UserResponse } from 'stream-chat';

export const listUsers = (users: UserResponse[]) => {
  let outStr = '';

  const slicedArr = users.map((item) => item.name || item.id).slice(0, 5);
  const restLength = users.length - slicedArr.length;

  const commaSeparatedUsers = slicedArr.join(', ');
  outStr = commaSeparatedUsers;
  if (restLength > 0) {
    outStr += ` +${restLength}`;
  }

  return outStr;
};

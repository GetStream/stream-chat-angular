import { UserResponse } from 'stream-chat';

export const listUsers = (users: UserResponse[]) => {
  let outStr = '';

  const slicedArr = users.map((item) => item.name || item.id).slice(0, 5);
  const restLength = users.length - slicedArr.length;

  if (slicedArr.length === 1) {
    outStr = `${slicedArr[0]} `;
  } else if (slicedArr.length === 2) {
    // joins all with "and" but =no commas
    // example: "bob and sam"
    outStr = `${slicedArr[0]} and ${slicedArr[1]}`;
  } else if (slicedArr.length > 2) {
    // joins all with commas, but last one gets ", and" (oxford comma!)
    // example: "bob, joe, sam and 4 more"
    if (restLength === 0) {
      // mutate slicedArr to remove last user to display it separately
      const lastUser = slicedArr.splice(slicedArr.length - 2, 1)[0];
      const commaSeparatedUsers = slicedArr.join(', ');
      outStr = `${commaSeparatedUsers}, and ${lastUser}`;
    } else {
      const commaSeparatedUsers = slicedArr.join(', ');
      outStr = `${commaSeparatedUsers} and ${restLength} more`;
    }
  }

  return outStr;
};

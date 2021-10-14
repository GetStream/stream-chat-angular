import { MessageResponse, UserResponse } from 'stream-chat';
import { v4 as uuidv4 } from 'uuid';

export const createMessagePreview = (user: UserResponse, text: string) => {
  const clientSideId = `${user.id}-${uuidv4()}`;

  return {
    __html: text,
    created_at: new Date(),
    html: text,
    id: clientSideId,
    reactions: [],
    status: 'sending',
    text,
    type: 'regular',
    user,
  } as unknown as MessageResponse;
};

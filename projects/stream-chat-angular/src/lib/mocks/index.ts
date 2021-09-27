import { UserResponse } from 'stream-chat';
import { DefaultUserType, StreamMessage } from '../types';

export const mockCurrentUser = () =>
  ({
    id: 'currentUser',
    name: 'Bob',
    image: 'link/to/photo',
  } as UserResponse<DefaultUserType>);

export const mockMessage = () =>
  ({
    id: 'id',
    text: 'Hello from Angular SDK',
    user: mockCurrentUser(),
    type: 'regular',
    status: 'received',
    created_at: new Date('2021-09-14T13:08:30.004112Z'),
    readBy: [{ id: 'alice', name: 'Alice' }],
  } as any as StreamMessage);

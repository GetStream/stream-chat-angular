import { LocalMessage } from 'stream-chat';
import { StreamMessage } from './types';

/**
 * Removes the SDK specific fields from a `StreamMessage`, so it can be handed back to stream-chat
 * @param message
 * @returns the message in the `LocalMessage` format stream-chat uses
 */
export const toLocalMessage = (
  message: StreamMessage | LocalMessage
): LocalMessage => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    readBy: _readBy,
    translation: _translation,
    errorStatusCode: _errorStatusCode,
    ...rest
  } = message as Partial<StreamMessage> & LocalMessage;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return rest;
};

import { Channel, LocalMessage, MessageResponse } from 'stream-chat';
import { MessageWithDates, StreamMessage } from './types';

export const getMessageTranslation = (
  message?: StreamMessage | MessageResponse | LocalMessage | MessageWithDates,
  channel?: Channel,
  user?: { id?: string; language?: string }
) => {
  const language = user?.language || channel?.data?.auto_translation_language;
  if (language && message?.i18n && message?.user?.id !== user?.id) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
    return message.i18n[`${language}_text`];
  } else {
    return undefined;
  }
};

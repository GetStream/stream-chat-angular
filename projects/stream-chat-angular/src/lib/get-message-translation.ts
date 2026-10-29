import { Channel, LocalMessage, MessageResponse } from 'stream-chat';
import { StreamMessage } from './types';

/**
 * The language messages are translated to: the user's language, or the auto translation language of the channel
 * @param channel
 * @param user
 * @returns the language, if there is any
 */
export const getTranslationLanguage = (
  channel?: Channel,
  user?: { id?: string; language?: string }
) => user?.language || channel?.data?.auto_translation_language;

export const getMessageTranslation = (
  message?: StreamMessage | MessageResponse | LocalMessage,
  channel?: Channel,
  user?: { id?: string; language?: string }
) => {
  const language = getTranslationLanguage(channel, user);
  if (language && message?.i18n && message?.user?.id !== user?.id) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
    return message.i18n[`${language}_text`];
  } else {
    return undefined;
  }
};

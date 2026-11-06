import { Channel, LocalMessage, MessageResponse } from 'stream-chat';

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

/**
 * Returns the translation of the message text (the messages of the current user aren't translated)
 * @param message
 * @param language the language to translate to, use `ChannelService.activeChannelTranslationLanguage$` or `getTranslationLanguage`
 * @param currentUserId the ID of the current user
 * @returns the translation, if there is any
 */
export const getMessageTranslation = (
  message?: LocalMessage | MessageResponse,
  language?: string,
  currentUserId?: string
) => {
  if (language && message?.i18n && message?.user?.id !== currentUserId) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
    return message.i18n[`${language}_text`];
  } else {
    return undefined;
  }
};

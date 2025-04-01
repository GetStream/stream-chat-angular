import {
  Channel,
  LocalMessageBase,
  MessageResponseBase,
  TranslationLanguages,
  UserResponse,
} from 'stream-chat';
import { StreamMessage } from './types';

export const getMessageTranslation = (
  message?: StreamMessage | LocalMessageBase | MessageResponseBase,
  channel?: Channel,
  user?: UserResponse
) => {
  const language =
    user?.language ||
    (channel?.data?.auto_translation_language as TranslationLanguages);
  if (language && message?.i18n && message?.user?.id !== user?.id) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
    return message.i18n[`${language}_text`];
  } else {
    return undefined;
  }
};

import {
  Channel,
  FormatMessageResponse,
  MessageResponse,
  TranslationLanguages,
  User,
} from 'stream-chat';
import { DefaultStreamChatGenerics, StreamMessage } from './types';

export const getMessageTranslation = <
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
>(
  message?: StreamMessage | MessageResponse | FormatMessageResponse,
  channel?: Channel<T>,
  user?: User
) => {
  const language =
    user?.language ||
    (channel?.data?.auto_translation_language as TranslationLanguages);
  if (language && message?.i18n && message?.user?.id !== user?.id) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return message.i18n[`${language}_text` as `${TranslationLanguages}_text`];
  } else {
    return undefined;
  }
};

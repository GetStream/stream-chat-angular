import { StreamMessage } from '../types';

export type GroupStyle = '' | 'middle' | 'top' | 'bottom' | 'single';

export const getGroupStyles = (
  message: StreamMessage,
  previousMessage?: StreamMessage,
  nextMessage?: StreamMessage,
  noGroupByUser = false,
  lastReadMessageId?: string
): GroupStyle => {
  if (
    noGroupByUser ||
    (message.attachments && message.attachments.length !== 0)
  )
    return 'single';

  const isTopMessage =
    !previousMessage ||
    !isOnSameDay(previousMessage.created_at, message.created_at) ||
    previousMessage.type === 'system' ||
    (previousMessage.attachments &&
      previousMessage.attachments?.length !== 0) ||
    message.user?.id !== previousMessage.user?.id ||
    previousMessage.type === 'error' ||
    previousMessage.deleted_at ||
    previousMessage.id === lastReadMessageId ||
    previousMessage.message_text_updated_at ||
    (message.reaction_counts &&
      Object.keys(message.reaction_counts).length > 0);

  const isBottomMessage =
    !nextMessage ||
    !isOnSameDay(message.created_at, nextMessage.created_at) ||
    nextMessage.type === 'system' ||
    (nextMessage.attachments && nextMessage.attachments?.length !== 0) ||
    message.user?.id !== nextMessage.user?.id ||
    nextMessage.type === 'error' ||
    nextMessage.deleted_at ||
    message.id === lastReadMessageId ||
    message.message_text_updated_at ||
    (nextMessage.reaction_counts &&
      Object.keys(nextMessage.reaction_counts).length > 0);

  if (!isTopMessage && !isBottomMessage) {
    if (message.deleted_at || message.type === 'error') return 'single';
    return 'middle';
  }

  if (isBottomMessage) {
    if (isTopMessage || message.deleted_at || message.type === 'error')
      return 'single';
    return 'bottom';
  }

  if (isTopMessage) return 'top';

  return '';
};

const isOnSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

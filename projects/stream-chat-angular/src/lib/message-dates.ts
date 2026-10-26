import {
  dateToNs,
  LocalMessage,
  MessageResponse,
  nsToDate,
  TimestampNS,
} from 'stream-chat';
import { MessageDateFields, MessageWithDates, StreamMessage } from './types';

const toDate = (value?: TimestampNS | Date | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return value instanceof Date ? value : nsToDate(value);
};

const toNs = (value?: TimestampNS | Date | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return value instanceof Date ? dateToNs(value) : value;
};

/**
 * stream-chat stores message dates as `TimestampNS` (unix nanoseconds), the SDK's `StreamMessage` type uses `Date` objects
 * @param message
 * @returns the message with `Date` date fields
 */
export const convertMessageDatesToDate = <T extends MessageResponse>(
  message: T
): MessageWithDates<T> & {
  quoted_message?: MessageWithDates;
} => {
  const { quoted_message, ...rest } = message;
  return {
    ...rest,
    created_at: toDate(message.created_at) ?? new Date(),
    updated_at: toDate(message.updated_at) ?? new Date(),
    deleted_at: toDate(message.deleted_at),
    pinned_at: toDate(message.pinned_at),
    pin_expires: toDate(message.pin_expires),
    message_text_updated_at: toDate(message.message_text_updated_at),
    quoted_message: quoted_message
      ? convertMessageDatesToDate(quoted_message)
      : undefined,
  } as MessageWithDates<T> & { quoted_message?: MessageWithDates };
};

/**
 * Converts a `StreamMessage` back to the `LocalMessage` format stream-chat uses
 * @param message
 * @returns the message with `TimestampNS` date fields, and without SDK specific fields
 */
export const convertStreamMessageToLocalMessage = (
  message: StreamMessage | LocalMessage
): LocalMessage => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    readBy: _readBy,
    translation: _translation,
    errorStatusCode: _errorStatusCode,
    quoted_message,
    ...rest
  } = message as Partial<StreamMessage> & Record<MessageDateFields, unknown>;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const dates = rest as Record<
    MessageDateFields,
    TimestampNS | Date | undefined
  >;
  return {
    ...rest,
    created_at: toNs(dates.created_at),
    updated_at: toNs(dates.updated_at),
    deleted_at: toNs(dates.deleted_at),
    pinned_at: toNs(dates.pinned_at),
    pin_expires: toNs(dates.pin_expires),
    message_text_updated_at: toNs(dates.message_text_updated_at),
    quoted_message: quoted_message
      ? convertStreamMessageToLocalMessage(
          quoted_message as unknown as StreamMessage
        )
      : undefined,
  } as unknown as LocalMessage;
};

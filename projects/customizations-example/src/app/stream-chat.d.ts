import { DefaultAttachmentData, DefaultChannelData } from 'stream-chat-angular';

declare module 'stream-chat' {
  interface CustomChannelData extends DefaultChannelData {}

  interface CustomAttachmentData extends DefaultAttachmentData {}
}

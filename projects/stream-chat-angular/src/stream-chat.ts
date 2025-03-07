import 'stream-chat';
import { DefaultChannelData, DefaultAttachmentData } from './lib/types-custom';

declare module 'stream-chat' {
  interface CustomAttachmentData extends DefaultAttachmentData {}

  interface CustomChannelData extends DefaultChannelData {}
}

import { Attachment } from 'stream-chat';

export const isImageAttachment = (attachment: Attachment) => {
  return (
    attachment.type === 'image' &&
    !attachment.title_link &&
    !attachment.og_scrape_url
  );
};

import { Attachment, UserResponse } from 'stream-chat';
import { mockCurrentUser } from './mocks';
import { createMessagePreview } from './message-preview';
declare module 'stream-chat' {
  interface CustomMessageData {
    isVote?: boolean;
    options?: string[];
  }
}

describe('createMessagePreview', () => {
  it('should create message preview', () => {
    const user = mockCurrentUser();
    const text = 'When to go to the cinema?';
    const attachments = [
      { fallback: 'image.png', image_url: 'http://url/to/image' },
      { fallback: 'christmas.jpg', image_url: 'http://url/to/image' },
    ] as Attachment[];
    const users = [{ id: 'jack', name: 'Jack' }] as UserResponse[];
    const parentId = 'parentId';
    const quotedMessageId = 'quotedMessageId';
    const preview = createMessagePreview(
      user,
      text,
      attachments,
      users,
      parentId,
      quotedMessageId,
      {
        isVote: true,
        options: ['Monday', 'Tuesday', 'Friday'],
      }
    );

    expect(preview.created_at).not.toBeUndefined();
    expect(typeof preview.created_at).toBe('number');
    expect(preview.updated_at).toBe(preview.created_at);
    expect(preview.status).toBe('sending');
    expect(preview.html).toBe(text);
    expect(preview.user).toBe(user);
    expect(preview.id).toContain(user.id);
    expect(preview.attachments).toBe(attachments);
    expect(preview.mentioned_users).toBe(users);
    expect(preview.parent_id).toBe(parentId);
    expect(preview.quoted_message_id).toBe(quotedMessageId);
    expect(preview.custom.isVote).toBe(true);
    expect(preview.custom.options).toEqual(['Monday', 'Tuesday', 'Friday']);
  });
});

import { mockCurrentUser } from './mocks';
import { createMessagePreview } from './message-preview';

describe('createMessagePreview', () => {
  it('should create message preview', () => {
    const user = mockCurrentUser();
    const text = 'this is my messge';
    const attachments = [
      { fallback: 'image.png', image_url: 'url/to/image' },
      { fallback: 'christmas.jpg', image_url: 'url/to/image' },
    ];
    const users = [{ id: 'jack', name: 'Jack' }];
    const parentId = 'parentId';
    const quotedMessageId = 'quotedMessageId';
    const preview = createMessagePreview(
      user,
      text,
      attachments,
      users,
      parentId,
      quotedMessageId
    );

    expect(preview.created_at).not.toBeUndefined();
    expect(preview.html).toBe(text);
    expect(preview.__html).toBe(text);
    expect(preview.user).toBe(user);
    expect(preview.id).toContain(user.id);
    expect(preview.attachments).toBe(attachments);
    expect(preview.mentioned_users).toBe(users);
    expect(preview.parent_id).toBe(parentId);
    expect(preview.quoted_message_id).toBe(quotedMessageId);
  });
});

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
    const preview = createMessagePreview(user, text, attachments);

    expect(preview.created_at).not.toBeUndefined();
    expect(preview.html).toBe(text);
    expect(preview.__html).toBe(text);
    expect(preview.user).toBe(user);
    expect(preview.id).toContain(user.id);
    expect(preview.attachments).toBe(attachments);
  });
});

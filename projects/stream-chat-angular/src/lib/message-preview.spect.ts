import { mockCurrentUser } from './mocks';
import { createMessagePreview } from './message-preview';

describe('createMessagePreview', () => {
  it('should create message preview', () => {
    const user = mockCurrentUser();
    const text = 'this is my messge';
    const preview = createMessagePreview(user, text);

    expect(preview.created_at).not.toBeUndefined();
    expect(preview.html).toBe(text);
    expect(preview._html).toBe(text);
    expect(preview.user).toBe(user);
    expect(preview.id).toContain(user.id);
  });
});

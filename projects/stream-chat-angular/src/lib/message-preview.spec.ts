import { mockCurrentUser } from './mocks';
import { createMessagePreview } from './message-preview';
import {
  DefaultAttachmentType,
  DefaultChannelType,
  DefaultStreamChatGenerics,
  DefaultUserType,
  StreamMessage,
  UnknownType,
} from './types';
import { LiteralStringForUnion } from 'stream-chat';

describe('createMessagePreview', () => {
  it('should create message preview', () => {
    const user = mockCurrentUser();
    const text = 'When to go to the cinema?';
    const attachments = [
      { fallback: 'image.png', image_url: 'http://url/to/image' },
      { fallback: 'christmas.jpg', image_url: 'http://url/to/image' },
    ];
    const users = [{ id: 'jack', name: 'Jack' }];
    const parentId = 'parentId';
    const quotedMessageId = 'quotedMessageId';
    type MyMessageType = StreamMessage & {
      isVote: boolean;
      results: number[];
      options: string[];
    };
    type MyGenerics = DefaultStreamChatGenerics & {
      messageType: MyMessageType;
      attachmentType: DefaultAttachmentType;
      channelType: DefaultChannelType;
      commandType: LiteralStringForUnion;
      eventType: UnknownType;
      reactionType: UnknownType;
      userType: DefaultUserType;
    };
    const preview = createMessagePreview<MyGenerics>(
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
    expect(preview.html).toBe(text);
    expect(preview.__html).toBe(text);
    expect(preview.user).toBe(user);
    expect(preview.id).toContain(user.id);
    expect(preview.attachments).toBe(attachments);
    expect(preview.mentioned_users).toBe(users);
    expect(preview.parent_id).toBe(parentId);
    expect(preview.quoted_message_id).toBe(quotedMessageId);
    expect(preview.isVote).toBe(true);
    expect(preview.options).toEqual(['Monday', 'Tuesday', 'Friday']);
  });
});

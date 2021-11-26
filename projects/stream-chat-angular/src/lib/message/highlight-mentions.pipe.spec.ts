import { HighlightMentionsPipe } from './highlight-mentions.pipe';

describe('HighlightMentionsPipe', () => {
  it('should highlight mentioned users', () => {
    const pipe = new HighlightMentionsPipe();
    const mentionedUsers = [{ id: 'jack', name: 'Jack' }, { id: 'sara' }];
    const text =
      'Hi @Jack! This is my email address: jack@gmail.com. Do you know anything about @sara? Bye @Jack';
    const hightlightedText =
      'Hi <b>@Jack</b>! This is my email address: jack@gmail.com. Do you know anything about <b>@sara</b>? Bye <b>@Jack</b>';

    expect(pipe.transform(text, mentionedUsers)).toEqual(hightlightedText);
  });
});

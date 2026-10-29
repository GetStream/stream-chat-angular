import { Attachment } from 'stream-chat';
import { areAttachmentsEqualIgnoringUrlSignatures } from './attachment-utils';

describe('areAttachmentsEqualIgnoringUrlSignatures', () => {
  const image = (url: string, extra: Partial<Attachment> = {}): Attachment => ({
    type: 'image',
    image_url: url,
    thumb_url: url,
    custom: {},
    ...extra,
  });

  it('should ignore the query string of URLs', () => {
    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [image('https://cdn.example.com/a.png?Signature=1')],
        [image('https://cdn.example.com/a.png?Signature=2')]
      )
    ).toBeTrue();
  });

  it('should compare nested URLs (e.g. giphy)', () => {
    const giphy = (url: string) =>
      ({
        type: 'giphy',
        custom: {},
        giphy: { fixed_height: { url, width: '100', height: '100' } },
      } as unknown as Attachment);

    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [giphy('https://media.giphy.com/a.gif?sig=1')],
        [giphy('https://media.giphy.com/a.gif?sig=2')]
      )
    ).toBeTrue();

    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [giphy('https://media.giphy.com/a.gif?sig=1')],
        [giphy('https://media.giphy.com/b.gif?sig=1')]
      )
    ).toBeFalse();
  });

  it('should detect other changes', () => {
    const url = 'https://cdn.example.com/a.png?Signature=1';

    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [image(url)],
        [image('https://cdn.example.com/b.png?Signature=1')]
      )
    ).toBeFalse();

    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [image(url)],
        [image(url, { title: 'New title' })]
      )
    ).toBeFalse();

    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [image(url)],
        [image(url), image(url)]
      )
    ).toBeFalse();

    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [image(url, { custom: { duration: 1 } })],
        [image(url, { custom: { duration: 2 } })]
      )
    ).toBeFalse();
  });

  it('should treat missing attachments as an empty list', () => {
    expect(areAttachmentsEqualIgnoringUrlSignatures(undefined, [])).toBeTrue();
    expect(
      areAttachmentsEqualIgnoringUrlSignatures(undefined, [
        image('https://cdn.example.com/a.png'),
      ])
    ).toBeFalse();
  });
});

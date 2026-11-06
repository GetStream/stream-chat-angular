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

  it(`should compare the query string of giphy URLs (they aren't CDN links)`, () => {
    const giphy = (url: string) =>
      ({
        type: 'giphy',
        custom: {},
        giphy: { fixed_height: { url, width: '100', height: '100' } },
      } as unknown as Attachment);

    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [giphy('https://media.giphy.com/a.gif?sig=1')],
        [giphy('https://media.giphy.com/a.gif?sig=1')]
      )
    ).toBeTrue();

    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [giphy('https://media.giphy.com/a.gif?sig=1')],
        [giphy('https://media.giphy.com/a.gif?sig=2')]
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

  it('should ignore the query string of every CDN link', () => {
    const file = (signature: string): Attachment => ({
      type: 'file',
      asset_url: `https://cdn.example.com/a.pdf?Signature=${signature}`,
      thumb_url: `https://cdn.example.com/a.png?Signature=${signature}`,
      custom: {},
    });

    expect(
      areAttachmentsEqualIgnoringUrlSignatures([file('1')], [file('2')])
    ).toBeTrue();
  });

  it(`should compare the query string of links that aren't CDN links`, () => {
    const link = (url: string): Attachment => ({
      type: 'image',
      image_url: 'https://cdn.example.com/a.png?Signature=1',
      title_link: url,
      og_scrape_url: url,
      custom: {},
    });

    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [link('https://youtube.com/watch?v=A')],
        [link('https://youtube.com/watch?v=B')]
      )
    ).toBeFalse();

    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [
          image('https://cdn.example.com/a.png', {
            custom: {
              link: 'https://example.com/?a=1',
            } as unknown as Attachment['custom'],
          }),
        ],
        [
          image('https://cdn.example.com/a.png', {
            custom: {
              link: 'https://example.com/?a=2',
            } as unknown as Attachment['custom'],
          }),
        ]
      )
    ).toBeFalse();

    // only top-level fields are CDN links, the same key nested somewhere else isn't
    expect(
      areAttachmentsEqualIgnoringUrlSignatures(
        [
          image('https://cdn.example.com/a.png', {
            custom: {
              image_url: 'https://example.com/b.png?a=1',
            } as unknown as Attachment['custom'],
          }),
        ],
        [
          image('https://cdn.example.com/a.png', {
            custom: {
              image_url: 'https://example.com/b.png?a=2',
            } as unknown as Attachment['custom'],
          }),
        ]
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

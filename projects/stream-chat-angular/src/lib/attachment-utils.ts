import { Attachment } from 'stream-chat';

const isUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//.test(value);

const withoutQueryString = (url: string) => url.split('?')[0];

// The attachment fields that contain CDN links, their signature (query string) can be renewed without the file changing
const cdnUrlFields = ['image_url', 'thumb_url', 'asset_url'];

/**
 * @param path the keys leading to the value inside the attachment
 * @returns `true` if the value is a CDN link (one of the `cdnUrlFields`)
 */
const isCdnUrlPath = (path: string[]) =>
  path.length === 1 && cdnUrlFields.includes(path[0]);

/**
 * Deep equality check, CDN links are compared without their query string
 * @param value1
 * @param value2
 * @param path the keys leading to the values inside the attachment
 * @returns `true` if the values are equal
 */
const isEqualIgnoringCdnUrlSignatures = (
  value1: unknown,
  value2: unknown,
  path: string[] = []
): boolean => {
  if (value1 === value2) {
    return true;
  }
  if (isCdnUrlPath(path) && isUrl(value1) && isUrl(value2)) {
    return withoutQueryString(value1) === withoutQueryString(value2);
  }
  if (
    typeof value1 !== 'object' ||
    typeof value2 !== 'object' ||
    value1 === null ||
    value2 === null ||
    Array.isArray(value1) !== Array.isArray(value2)
  ) {
    return false;
  }
  const object1 = value1 as Record<string, unknown>;
  const object2 = value2 as Record<string, unknown>;
  const keys = Object.keys(object1);
  return (
    keys.length === Object.keys(object2).length &&
    keys.every(
      (key) =>
        key in object2 &&
        isEqualIgnoringCdnUrlSignatures(object1[key], object2[key], [
          ...path,
          key,
        ])
    )
  );
};

/**
 * Attachment URLs are signed, and the signature (the query string) is renewed by some message updates (for example when a reaction is added or removed), this function tells if two attachment lists only differ in the URL signatures of the CDN links (`image_url`, `thumb_url` and `asset_url`)
 * @param attachments1
 * @param attachments2
 * @returns `true` if the attachments are the same, apart from the URL signatures
 */
export const areAttachmentsEqualIgnoringUrlSignatures = (
  attachments1: Attachment[] | undefined,
  attachments2: Attachment[] | undefined
) => {
  const list1 = attachments1 ?? [];
  const list2 = attachments2 ?? [];
  return (
    list1.length === list2.length &&
    list1.every((a, i) => isEqualIgnoringCdnUrlSignatures(a, list2[i]))
  );
};

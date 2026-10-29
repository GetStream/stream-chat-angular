import { Attachment } from 'stream-chat';

const isUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//.test(value);

const withoutQueryString = (url: string) => url.split('?')[0];

/**
 * Deep equality check, URLs are compared without their query string
 * @param value1
 * @param value2
 * @returns `true` if the values are equal
 */
const isEqualIgnoringUrlQueryStrings = (
  value1: unknown,
  value2: unknown
): boolean => {
  if (value1 === value2) {
    return true;
  }
  if (isUrl(value1) && isUrl(value2)) {
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
        isEqualIgnoringUrlQueryStrings(object1[key], object2[key])
    )
  );
};

/**
 * Attachment URLs are signed, and the signature (the query string) is renewed by some message updates (for example when a reaction is added or removed), this function tells if two attachment lists only differ in the URL signatures
 * @param attachments1
 * @param attachments2
 * @returns `true` if the attachments are the same, apart from the URL signatures
 */
export const areAttachmentsEqualIgnoringUrlSignatures = (
  attachments1: Attachment[] | undefined,
  attachments2: Attachment[] | undefined
) => isEqualIgnoringUrlQueryStrings(attachments1 ?? [], attachments2 ?? []);

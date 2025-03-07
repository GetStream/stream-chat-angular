export interface DefaultChannelData {
  image?: string;
}

export interface DefaultAttachmentData {
  /**
   * @deprecated Please use `image_url` instead
   */
  img_url?: string;
  /**
   * Will be `true` if an attachment was added using `attachmentService.addAttachment`
   *
   * This is a non-standard property, other SDKs will ignore this property
   */
  isCustomAttachment?: boolean;
}

export interface DefaultChannelData {
  image?: string;
  name?: string;
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
  /**
   * The duration of the attachment in seconds (used for voice recordings)
   */
  duration?: number;
  /**
   * The waveform data of a voice recording, values are between 0 and 1
   */
  waveform_data?: number[];
}

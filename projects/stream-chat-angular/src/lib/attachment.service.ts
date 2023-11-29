import { Injectable } from '@angular/core';
import { isImageFile } from './is-image-file';
import { BehaviorSubject, Observable } from 'rxjs';
import { Attachment } from 'stream-chat';
import { ChannelService } from './channel.service';
import { isImageAttachment } from './is-image-attachment';
import { NotificationService } from './notification.service';
import { AttachmentUpload, DefaultStreamChatGenerics } from './types';

/**
 * The `AttachmentService` manages the uploads of a message input.
 */
@Injectable({
  providedIn: 'root',
})
export class AttachmentService<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> {
  /**
   * Emits the number of uploads in progress.
   */
  attachmentUploadInProgressCounter$: Observable<number>;
  /**
   * Emits the state of the uploads ([`AttachmentUpload[]`](https://github.com/GetStream/stream-chat-angular/blob/master/projects/stream-chat-angular/src/lib/types.ts)), it adds a state (`success`, `error` or `uploading`) to each file the user selects for upload. It is used by the [`AttachmentPreviewList`](../components/AttachmentPreviewListComponent.mdx) to display the attachment previews.
   */
  attachmentUploads$: Observable<AttachmentUpload[]>;
  private attachmentUploadInProgressCounterSubject =
    new BehaviorSubject<number>(0);
  private attachmentUploadsSubject = new BehaviorSubject<AttachmentUpload[]>(
    []
  );

  constructor(
    private channelService: ChannelService,
    private notificationService: NotificationService
  ) {
    this.attachmentUploadInProgressCounter$ =
      this.attachmentUploadInProgressCounterSubject.asObservable();
    this.attachmentUploads$ = this.attachmentUploadsSubject.asObservable();
  }

  /**
   * Resets the attachments uploads (for example after the message with the attachments sent successfully)
   */
  resetAttachmentUploads() {
    this.attachmentUploadsSubject.next([]);
  }

  /**
   * Uploads the selected files, and creates preview for image files. The result is propagated throught the `attachmentUploads$` stream.
   * @param fileList The files selected by the user
   * @returns A promise with the result
   */
  async filesSelected(fileList: FileList | null) {
    if (!fileList) {
      return;
    }
    const imageFiles: File[] = [];
    const dataFiles: File[] = [];
    const videoFiles: File[] = [];

    Array.from(fileList).forEach((file) => {
      if (isImageFile(file)) {
        imageFiles.push(file);
      } else if (file.type.startsWith('video/')) {
        videoFiles.push(file);
      } else {
        dataFiles.push(file);
      }
    });
    imageFiles.forEach((f) => this.createPreview(f));
    const newUploads = [
      ...imageFiles.map((file) => ({
        file,
        state: 'uploading' as 'uploading',
        type: 'image' as 'image',
      })),
      ...videoFiles.map((file) => ({
        file,
        state: 'uploading' as 'uploading',
        type: 'video' as 'video',
      })),
      ...dataFiles.map((file) => ({
        file,
        state: 'uploading' as 'uploading',
        type: 'file' as 'file',
      })),
    ];
    this.attachmentUploadsSubject.next([
      ...this.attachmentUploadsSubject.getValue(),
      ...newUploads,
    ]);
    await this.uploadAttachments(newUploads);
  }

  /**
   * You can add custom `image`, `video` and `file` attachments using this method.
   *
   * Note: If you just want to use your own CDN for file uploads, you don't necessary need this method, you can just specify you own upload function in the [`ChannelService`](./ChannelService.mdx)
   *
   * @param attachment
   */
  addAttachment(attachment: Attachment<T>) {
    attachment.isCustomAttachment = true;
    this.createFromAttachments([attachment]);
  }

  /**
   * Retries to upload an attachment.
   * @param file
   * @returns A promise with the result
   */
  async retryAttachmentUpload(file: File) {
    const attachmentUploads = this.attachmentUploadsSubject.getValue();
    const upload = attachmentUploads.find((u) => u.file === file);
    if (!upload) {
      return;
    }
    upload.state = 'uploading';
    this.attachmentUploadsSubject.next([...attachmentUploads]);
    await this.uploadAttachments([upload]);
  }

  /**
   * Deletes an attachment, the attachment can have any state (`error`, `uploading` or `success`).
   * @param upload
   */
  async deleteAttachment(upload: AttachmentUpload) {
    const attachmentUploads = this.attachmentUploadsSubject.getValue();
    let result!: AttachmentUpload[];
    if (
      upload.state === 'success' &&
      !upload.fromAttachment?.isCustomAttachment
    ) {
      try {
        await this.channelService.deleteAttachment(upload);
        result = [...attachmentUploads];
        const index = attachmentUploads.indexOf(upload);
        result.splice(index, 1);
      } catch (error) {
        result = attachmentUploads;
        this.notificationService.addTemporaryNotification(
          'streamChat.Error deleting attachment'
        );
      }
    } else {
      result = [...attachmentUploads];
      const index = attachmentUploads.indexOf(upload);
      result.splice(index, 1);
    }
    this.attachmentUploadsSubject.next([...result]);
  }

  /**
   * Maps the current uploads to a format that can be sent along with the message to the Stream API.
   * @returns the attachments
   */
  mapToAttachments() {
    const attachmentUploads = this.attachmentUploadsSubject.getValue();
    return attachmentUploads
      .filter((r) => r.state === 'success')
      .map((r) => {
        const attachment: Attachment = {
          type: r.type,
        };
        if (r.fromAttachment) {
          return r.fromAttachment;
        } else {
          attachment.mime_type = r.file?.type;
          if (r.type === 'image') {
            attachment.fallback = r.file?.name;
            attachment.image_url = r.url;
          } else {
            attachment.asset_url = r.url;
            attachment.title = r.file?.name;
            attachment.file_size = r.file?.size;
            attachment.thumb_url = r.thumb_url;
          }
        }

        return attachment;
      });
  }

  /**
   * Maps attachments received from the Stream API to uploads. This is useful when editing a message.
   * @param attachments Attachemnts received with the message
   */
  createFromAttachments(attachments: Attachment<T>[]) {
    const attachmentUploads: AttachmentUpload[] = [];
    attachments.forEach((attachment) => {
      if (isImageAttachment(attachment)) {
        attachmentUploads.push({
          url: (attachment.img_url ||
            attachment.thumb_url ||
            attachment.image_url) as string,
          state: 'success',
          type: 'image',
          file: {
            name: attachment.fallback,
            type: attachment.mime_type,
          } as File,
          fromAttachment: attachment,
        });
      } else if (attachment.type === 'file' || attachment.type === 'video') {
        attachmentUploads.push({
          url: attachment.asset_url,
          state: 'success',
          file: {
            name: attachment.title,
            size: attachment.file_size,
            type: attachment.mime_type,
          } as File,
          type: attachment.type,
          thumb_url: attachment.thumb_url,
          fromAttachment: attachment,
        });
      }
    });

    if (attachmentUploads.length > 0) {
      this.attachmentUploadsSubject.next([
        ...this.attachmentUploadsSubject.getValue(),
        ...attachmentUploads,
      ]);
    }
  }

  private createPreview(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const attachmentUploads = this.attachmentUploadsSubject.getValue();
      const upload = attachmentUploads.find((upload) => upload.file === file);
      if (!upload) {
        return;
      }
      upload.previewUri = event.target?.result || undefined;
      this.attachmentUploadsSubject.next([...attachmentUploads]);
    };
    reader.readAsDataURL(file as Blob);
  }

  private async uploadAttachments(uploads: AttachmentUpload[]) {
    this.attachmentUploadInProgressCounterSubject.next(
      this.attachmentUploadInProgressCounterSubject.getValue() + 1
    );
    const result = await this.channelService.uploadAttachments(uploads);
    const attachmentUploads = this.attachmentUploadsSubject.getValue();
    result.forEach((r) => {
      const upload = attachmentUploads.find((upload) => upload.file === r.file);
      if (!upload) {
        if (r.url) {
          void this.channelService.deleteAttachment(r);
        }
        return;
      }
      upload.state = r.state;
      upload.url = r.url;
      upload.thumb_url = r.thumb_url;
      if (upload.state === 'error') {
        upload.errorReason = r.errorReason;
        upload.errorExtraInfo = r.errorExtraInfo;
        let errorKey;
        const translateParams: { name: string; ext?: string; limit?: string } =
          { name: upload.file.name };
        switch (upload.errorReason) {
          case 'file-extension':
            errorKey =
              'streamChat.Error uploading file, extension not supported';
            translateParams.ext = upload.errorExtraInfo?.[0]?.param;
            break;
          case 'file-size':
            errorKey =
              'streamChat.Error uploading file, maximum file size exceeded';
            translateParams.limit = upload.errorExtraInfo?.[0]?.param;
            break;
          default:
            errorKey = 'streamChat.Error uploading file';
        }
        this.notificationService.addTemporaryNotification(
          errorKey,
          'error',
          undefined,
          translateParams
        );
      }
    });
    this.attachmentUploadInProgressCounterSubject.next(
      this.attachmentUploadInProgressCounterSubject.getValue() - 1
    );
    this.attachmentUploadsSubject.next([...attachmentUploads]);
  }
}

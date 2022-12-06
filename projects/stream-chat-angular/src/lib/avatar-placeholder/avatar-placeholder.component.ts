import { Component, Input } from '@angular/core';
import { Channel, User } from 'stream-chat';
import { CustomTemplatesService } from '../custom-templates.service';
import {
  AvatarContext,
  AvatarLocation,
  AvatarType,
  DefaultStreamChatGenerics,
} from '../types';

/**
 * The `AvatarPlaceholder` component displays the [default avatar](./AvatarComponent.mdx) unless a [custom template](../services/CustomTemplatesService.mdx) is provided. This component is used by the SDK internally, you likely won't need to use it.
 */
@Component({
  selector: 'stream-avatar-placeholder',
  templateUrl: './avatar-placeholder.component.html',
  styles: [],
})
export class AvatarPlaceholderComponent {
  /**
   * An optional name of the image, used for fallback image or image title (if `imageUrl` is provided)
   */
  @Input() name: string | undefined;
  /**
   * The URL of the image to be displayed. If the image can't be displayed the first letter of the name input is displayed.
   */
  @Input() imageUrl: string | undefined;
  /**
   * The size in pixels of the avatar image.
   */
  @Input() size = 32;
  /**
   * The location the avatar will be displayed in
   */
  @Input() location: AvatarLocation | undefined;
  /**
   * The channel the avatar belongs to (if avatar of a channel is displayed)
   */
  @Input() channel?: Channel<DefaultStreamChatGenerics>;
  /**
   * The user the avatar belongs to (if avatar of a user is displayed)
   */
  @Input() user?: User<DefaultStreamChatGenerics>;
  /**
   * The type of the avatar: channel if channel avatar is displayed, user if user avatar is displayed
   */
  @Input() type: AvatarType | undefined;
  constructor(public customTemplatesService: CustomTemplatesService) {}

  getAvatarContext(): AvatarContext {
    return {
      name: this.name,
      imageUrl: this.imageUrl,
      size: this.size,
      location: this.location,
      type: this.type,
      user: this.user,
      channel: this.channel,
    };
  }
}

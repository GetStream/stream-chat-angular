import { Component, Input, OnChanges } from '@angular/core';
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
export class AvatarPlaceholderComponent implements OnChanges {
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
  /**
   * If channel/user image isn't provided the initials of the name of the channel/user is shown instead, you can choose how the initals should be computed
   */
  @Input() initialsType:
    | 'first-letter-of-first-word'
    | 'first-letter-of-each-word' = 'first-letter-of-first-word';
  /**
   * If a channel avatar is displayed, and if the channel has exactly two members a green dot is displayed if the other member is online. Set this flag to `false` to turn off this behavior.
   */
  @Input() showOnlineIndicator = true;
  context: AvatarContext = {
    name: undefined,
    imageUrl: undefined,
    size: undefined,
    location: undefined,
    channel: undefined,
    user: undefined,
    type: undefined,
    initialsType: undefined,
    showOnlineIndicator: undefined,
  };
  constructor(public customTemplatesService: CustomTemplatesService) {}

  ngOnChanges(): void {
    this.context = {
      name: this.name,
      imageUrl: this.imageUrl,
      size: this.size,
      location: this.location,
      type: this.type,
      user: this.user,
      channel: this.channel,
      initialsType: this.initialsType,
      showOnlineIndicator: this.showOnlineIndicator,
    };
  }
}

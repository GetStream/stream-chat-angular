import { Component, Input } from '@angular/core';
import { Channel, User } from 'stream-chat';
import { ChatClientService } from '../chat-client.service';
import {
  AvatarLocation,
  AvatarType,
  DefaultStreamChatGenerics,
} from '../types';

/**
 * The `Avatar` component displays the provided image, with fallback to the first letter of the optional name input.
 */
@Component({
  selector: 'stream-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent {
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
  isLoaded = false;
  isError = false;

  constructor(private chatClientService: ChatClientService) {}

  get initials() {
    let result: string = '';
    if (this.type === 'user') {
      result = this.name?.toString() || '';
    } else if (this.type === 'channel') {
      if (this.channel?.data?.name) {
        result = this.channel?.data?.name;
      } else {
        const otherMembers = Object.values(
          this.channel?.state?.members || {}
        ).filter(
          (m) => m.user_id !== this.chatClientService.chatClient.user?.id
        );
        if (otherMembers.length === 1) {
          result =
            otherMembers[0].user?.name || otherMembers[0].user?.name || '';
        } else {
          result = '#';
        }
      }
    }

    return result.charAt(0) || '';
  }
}

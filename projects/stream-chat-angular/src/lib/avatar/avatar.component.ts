import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
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
export class AvatarComponent
  implements OnChanges, OnInit, OnChanges, AfterViewInit
{
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
   * If a channel avatar is displayed, and if the channel has exactly two members a green dot is displayed if the other member is online. Set this flag to `false` to turn off this behavior.
   */
  @Input() showOnlineIndicator = true;
  /**
   * If channel/user image isn't provided the initials of the name of the channel/user is shown instead, you can choose how the initals should be computed
   */
  @Input() initialsType:
    | 'first-letter-of-first-word'
    | 'first-letter-of-each-word' = 'first-letter-of-first-word';
  isError = false;
  isOnline = false;
  private isOnlineSubscription?: Subscription;
  initials: string = '';
  fallbackChannelImage: string | undefined;
  private userId?: string;
  private isViewInited = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private chatClientService: ChatClientService,
    private ngZone: NgZone,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.chatClientService.user$.subscribe((u) => {
        if (u?.id !== this.userId) {
          this.userId = u?.id;
          if (this.type || this.channel || this.name) {
            this.setInitials();
            this.setFallbackChannelImage();
            this.updateIsOnlineSubscription();
          }
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['channel']) {
      this.updateIsOnlineSubscription();
    }
    if (changes.type || changes.name || changes.channel) {
      this.setInitials();
    }

    if (changes.type || changes.channel) {
      this.setFallbackChannelImage();
    }
  }

  private setFallbackChannelImage() {
    if (this.type !== 'channel') {
      this.fallbackChannelImage = undefined;
    } else {
      const otherMember = this.getOtherMemberIfOneToOneChannel();
      if (otherMember) {
        this.fallbackChannelImage = otherMember.image;
      } else {
        this.fallbackChannelImage = undefined;
      }
    }
  }

  private setInitials() {
    let result: string = '';
    if (this.type === 'user') {
      result = this.name?.toString() || '';
    } else if (this.type === 'channel') {
      if (this.channel?.data?.name) {
        result = this.channel?.data?.name;
      } else {
        const otherMember = this.getOtherMemberIfOneToOneChannel();
        if (otherMember) {
          result = otherMember.name || otherMember.id || '';
        } else {
          result = '#';
        }
      }
    }

    const words = result.split(' ');
    let initials: string;
    if (this.initialsType === 'first-letter-of-each-word') {
      initials = words.map((w) => w.charAt(0) || '').join('');
    } else {
      initials = words[0].charAt(0) || '';
    }
    this.initials = initials;
  }

  private updateIsOnlineSubscription() {
    if (this.channel) {
      const otherMember = this.getOtherMemberIfOneToOneChannel();
      if (otherMember) {
        this.isOnline = otherMember.online || false;
        this.isOnlineSubscription = this.chatClientService.events$
          .pipe(filter((e) => e.eventType === 'user.presence.changed'))
          .subscribe((event) => {
            if (event.event.user?.id === otherMember.id) {
              this.ngZone.run(() => {
                this.isOnline = event.event.user?.online || false;
              });
            }
          });
      } else {
        this.isOnline = false;
        this.isOnlineSubscription?.unsubscribe();
      }
    } else {
      this.isOnline = false;
      this.isOnlineSubscription?.unsubscribe();
    }
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
  }

  private getOtherMemberIfOneToOneChannel() {
    const otherMembers = Object.values(
      this.channel?.state?.members || {}
    ).filter((m) => m.user_id !== this.userId);
    if (otherMembers.length === 1) {
      return otherMembers[0].user;
    } else {
      return undefined;
    }
  }
}

import { Component, Input } from '@angular/core';
import { CustomTemplatesService } from '../custom-templates.service';
import { AvatarContext } from '../types';

/**
 * The `AvatarPlaceholder` component displays the [default avatar](./AvatarComponent.mdx) unless a [custom template](../services/CustomTemplatesService.mdx) is provided. This componet is used by the SDK internally, you likely won't need to use it.
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
  constructor(public customTemplatesService: CustomTemplatesService) {}

  getAvatarContext(): AvatarContext {
    return {
      name: this.name,
      imageUrl: this.imageUrl,
      size: this.size,
    };
  }
}

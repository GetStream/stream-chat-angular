import { Component, Input, OnChanges } from '@angular/core';
import { CustomTemplatesService } from '../custom-templates.service';
import { Icon } from '../icon/icon.component';
import { IconContext } from '../types';

/**
 * The `IconPlaceholder` component displays the [default icons](./IconComponent.mdx) unless a [custom template](../services/CustomTemplatesService.mdx) is provided. This component is used by the SDK internally, you likely won't need to use it.
 */
@Component({
  selector: 'stream-icon-placeholder',
  templateUrl: './icon-placeholder.component.html',
  styles: [],
})
export class IconPlaceholderComponent implements OnChanges {
  /**
   * The icon to display, the list of [supported icons](https://github.com/GetStream/stream-chat-angular/tree/master/projects/stream-chat-angular/src/lib/icon/icon.component.ts) can be found on GitHub.
   */
  @Input() icon: Icon | undefined;
  /**
   * The size of the icon (in pixels)
   */
  @Input() size: number | undefined;
  iconContext: IconContext = { icon: undefined, size: undefined };

  constructor(public customTemplatesService: CustomTemplatesService) {}

  ngOnChanges(): void {
    this.iconContext = {
      icon: this.icon,
      size: this.size,
    };
  }
}

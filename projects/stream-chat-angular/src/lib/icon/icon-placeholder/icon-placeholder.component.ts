import { Component, Input, OnChanges } from '@angular/core';
import { Icon } from '../icon.component';
import { IconContext } from '../../types';
import { CustomTemplatesService } from '../../custom-templates.service';

/**
 * The `IconPlaceholder` component displays the [default icons](/chat/docs/sdk/angular/components/IconComponent/) unless a [custom template](/chat/docs/sdk/angular/services/CustomTemplatesService/) is provided. This component is used by the SDK internally, you likely won't need to use it.
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
  iconContext: IconContext = { icon: undefined };

  constructor(public customTemplatesService: CustomTemplatesService) {}

  ngOnChanges(): void {
    this.iconContext = {
      icon: this.icon,
    };
  }
}

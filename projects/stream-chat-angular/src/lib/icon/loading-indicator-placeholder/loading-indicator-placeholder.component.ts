import { Component } from '@angular/core';
import { CustomTemplatesService } from '../../custom-templates.service';

/**
 * The `LoadingInficatorPlaceholder` component displays the [default loading indicator](./LoadingIndicatorComponent.mdx) unless a [custom template](../services/CustomTemplatesService.mdx) is provided. This component is used by the SDK internally, you likely won't need to use it.
 */
@Component({
  selector: 'stream-loading-indicator-placeholder',
  templateUrl: './loading-indicator-placeholder.component.html',
  styles: [],
})
export class LoadingIndicatorPlaceholderComponent {
  constructor(public customTemplatesService: CustomTemplatesService) {}
}

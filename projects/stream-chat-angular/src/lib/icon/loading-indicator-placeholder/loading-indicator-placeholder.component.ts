import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CustomTemplatesService } from '../../custom-templates.service';

/**
 * The `LoadingInficatorPlaceholder` component displays the [default loading indicator](/chat/docs/sdk/angular/v7-rc/components/LoadingIndicatorComponent/) unless a [custom template](/chat/docs/sdk/angular/v7-rc/services/CustomTemplatesService/) is provided. This component is used by the SDK internally, you likely won't need to use it.
 */
@Component({
  selector: 'stream-loading-indicator-placeholder',
  templateUrl: './loading-indicator-placeholder.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingIndicatorPlaceholderComponent {
  constructor(public customTemplatesService: CustomTemplatesService) {}
}

import { NgModule } from '@angular/core';
import { IconComponent } from './icon.component';
import { CommonModule } from '@angular/common';
import { LoadingIndicatorComponent } from './loading-indicator/loading-indicator.component';
import { IconPlaceholderComponent } from './icon-placeholder/icon-placeholder.component';
import { LoadingIndicatorPlaceholderComponent } from './loading-indicator-placeholder/loading-indicator-placeholder.component';

@NgModule({
  declarations: [
    IconComponent,
    IconPlaceholderComponent,
    LoadingIndicatorComponent,
    LoadingIndicatorPlaceholderComponent,
  ],
  imports: [CommonModule],
  exports: [
    IconComponent,
    IconPlaceholderComponent,
    LoadingIndicatorComponent,
    LoadingIndicatorPlaceholderComponent,
  ],
})
export class IconModule {}

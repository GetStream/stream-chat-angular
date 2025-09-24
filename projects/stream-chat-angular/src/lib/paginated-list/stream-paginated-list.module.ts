import { NgModule } from '@angular/core';
import { PaginatedListComponent } from './paginated-list.component';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { IconModule } from '../icon/icon.module';

@NgModule({
  declarations: [PaginatedListComponent],
  imports: [CommonModule, TranslateModule, IconModule],
  exports: [PaginatedListComponent],
})
export class StreamPaginatedListModule {}

import { NgModule } from '@angular/core';
import { PaginatedListComponent } from './paginated-list.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { IconModule } from '../icon/icon.module';

@NgModule({
  declarations: [PaginatedListComponent],
  imports: [CommonModule, TranslatePipe, IconModule],
  exports: [PaginatedListComponent],
})
export class StreamPaginatedListModule {}

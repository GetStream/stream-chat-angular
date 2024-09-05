import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UserResponse } from 'stream-chat';
import { DefaultStreamChatGenerics } from '../types';

/**
 * The `UserListComponent` can display a list of Stream users with pagination
 */
@Component({
  selector: 'stream-user-list',
  templateUrl: './user-list.component.html',
  styles: [],
})
export class UserListComponent {
  /**
   * The users to display
   */
  @Input() users: UserResponse<DefaultStreamChatGenerics>[] = [];
  /**
   * If `true`, the loading indicator will be displayed
   */
  @Input() isLoading = false;
  /**
   * If `false` the component won't ask for more data vua the `loadMore` output
   */
  @Input() hasMore = false;
  /**
   * The component will signal via this output when more items should be fetched
   *
   * The new items should be appended to the `items` array
   */
  @Output() readonly loadMore = new EventEmitter<void>();

  trackByUserId(_: number, item: UserResponse) {
    return item.id;
  }
}

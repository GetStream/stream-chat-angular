import { ChannelService } from './channel.service';
import {
  VirtualizedListQueryDirection,
  VirtualizedListScrollPosition,
  StreamMessage,
  VirtualizedListVerticalItemPosition,
} from './types';
import { map, Observable } from 'rxjs';
import { VirtualizedListService } from './virtualized-list.service';

/**
 * The `VirtualizedMessageListService` removes messages from the message list that are currently not in view
 */
export class VirtualizedMessageListService extends VirtualizedListService<StreamMessage> {
  constructor(
    public readonly mode: 'thread' | 'main',
    scrollPosition$: Observable<VirtualizedListScrollPosition>,
    private channelService: ChannelService,
  ) {
    const jumpToMessage$ = channelService.jumpToMessage$.pipe(
      map<
        { id?: string; parentId?: string },
        {
          item: Partial<StreamMessage> | undefined;
          position?: VirtualizedListVerticalItemPosition;
        }
      >((jumpToMessage) => {
        let result: {
          item: Partial<StreamMessage> | undefined;
          position?: VirtualizedListVerticalItemPosition;
        } = {
          item: undefined,
        };
        let targetMessageId: string | undefined;
        if (mode === 'main') {
          targetMessageId = jumpToMessage.parentId
            ? jumpToMessage.parentId
            : jumpToMessage.id;
        } else {
          targetMessageId = jumpToMessage.parentId
            ? jumpToMessage.id
            : undefined;
        }

        if (targetMessageId) {
          const messages =
            mode === 'main'
              ? channelService.activeChannelMessages
              : channelService.activeChannelThreadReplies;
          const id =
            targetMessageId === 'latest'
              ? messages[messages.length - 1]?.id
              : targetMessageId;
          if (id) {
            result = {
              item: { id },
              position: jumpToMessage.id === 'latest' ? 'bottom' : 'middle',
            };
          }
          channelService.clearMessageJump();
        }

        return result;
      }),
    );
    const messages$ =
      mode === 'main'
        ? channelService.activeChannelMessages$
        : channelService.activeThreadMessages$;
    super(
      messages$,
      scrollPosition$,
      jumpToMessage$,
      channelService.messagePageSize,
    );
  }

  protected loadMoreFromBuffer(direction: VirtualizedListQueryDirection): void {
    this.queryStateSubject.next({ state: `loading-${direction}` });
    setTimeout(() => {
      this.loadFromBuffer$.next();
      this.queryStateSubject.next({ state: 'success' });
    });
  }

  protected isEqual = (t1: StreamMessage, t2: StreamMessage) => t1.id === t2.id;

  protected query = (direction: VirtualizedListQueryDirection) => {
    const request =
      this.mode === 'main'
        ? (direction: 'older' | 'newer') =>
            this.channelService.loadMoreMessages(direction)
        : (direction: 'older' | 'newer') =>
            this.channelService.loadMoreThreadReplies(direction);
    const result = request(direction === 'top' ? 'older' : 'newer');
    if (result) {
      return result;
    } else {
      this.queryStateSubject.next({ state: 'success' });
      if (
        (direction === 'top' && this.bufferOnTop > 0) ||
        (direction === 'bottom' && this.bufferOnBottom > 0)
      ) {
        this.loadFromBuffer$.next();
      }
      return Promise.resolve();
    }
  };
}

import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
  combineLatest,
  distinctUntilChanged,
  filter,
  merge,
  of,
  pairwise,
  switchMap,
  take,
} from 'rxjs';
import {
  VirtualizedListQueryDirection,
  VirtualizedListQueryState,
  VirtualizedListScrollPosition,
  VirtualizedListVerticalItemPosition,
} from './types';

/**
 * The `VirtualizedListService` removes items from a list that are not currently displayed. This is a high-level overview of how it works:
 * - Create a new instance for each list that needs virtualization
 * - Input: Provide a reactive stream that emits all items in the list
 * - Input: Provide a reactive stream that emit the current scroll position (top, middle or bottom)
 * - Input: maximum number of items that are allowed in the list (in practice the service can make the virtualized list half this number, you should take this into account when choosing the value)
 * - Output: The service will emit the current list of displayed items via the virtualized items reactive stream
 * - For simplicity, the service won't track the height of the items, nor it needs an exact scroll location -> this is how removing items work:
 *   - If scroll location is bottom/top items around the current bottom/top item will be emitted in the virtualized items stream
 *   - If scroll location is middle, the service won't remove items, if new items are received, those will be appended to the virtualized list  (this means that in theory the list can grow very big if a lot of new items are received while the user is scrolled somewhere, this is a trade-off for the simplicity of no height tracking)
 *   - Since there is no height tracking, you should make sure to provide a maximum number that is big enough to fill the biggest expected screen size twice
 * - If the user scrolls to the bottom/top and there are no more local items to show, the service will trigger a query to load more items
 *   - Input: you should provide the page size to use, in order for the service to determine if loading is necessary
 *
 * The `VirtualizedMessageListService` provides an implementation for the message list component.
 */
export abstract class VirtualizedListService<T> {
  /**
   * The items that should be currently displayed, a subset of all items
   */
  virtualizedItems$: Observable<T[]>;
  /**
   * The result of the last query used to load more items
   */
  queryState$: Observable<VirtualizedListQueryState>;
  protected queryStateSubject = new BehaviorSubject<VirtualizedListQueryState>({
    state: 'success',
  });
  protected bufferOnTop = 0;
  protected bufferOnBottom = 0;
  protected loadFromBuffer$ = new Subject<void>();
  private virtualizedItemsSubject = new BehaviorSubject<T[]>([]);
  private subscriptions: Subscription[] = [];

  constructor(
    private allItems$: Observable<T[]>,
    private scrollPosition$: Observable<VirtualizedListScrollPosition>,
    public readonly jumpToItem$?: Observable<{
      item: Partial<T> | undefined;
      position?: VirtualizedListVerticalItemPosition;
    }>,
    public readonly pageSize = 25,
    public readonly maxItemCount = pageSize * 4,
  ) {
    this.virtualizedItems$ = this.virtualizedItemsSubject.asObservable();
    this.queryState$ = this.queryStateSubject.asObservable();
    this.subscriptions.push(
      this.virtualizedItems$.subscribe((virtaluzedItems) => {
        this.allItems$.pipe(take(1)).subscribe((allItems) => {
          if (virtaluzedItems.length === allItems.length) {
            this.bufferOnTop = 0;
            this.bufferOnBottom = 0;
          } else if (virtaluzedItems.length === 0) {
            this.bufferOnTop = allItems.length;
            this.bufferOnBottom = 0;
          } else {
            this.bufferOnTop = allItems.indexOf(virtaluzedItems[0]);
            this.bufferOnBottom =
              allItems.length -
              allItems.indexOf(virtaluzedItems[virtaluzedItems.length - 1]) -
              1;
          }
        });
      }),
    );
    this.subscriptions.push(
      merge(this.allItems$, this.loadFromBuffer$)
        .pipe(
          switchMap(() => {
            return combineLatest([
              this.allItems$.pipe(take(1)),
              this.scrollPosition$.pipe(take(1)),
            ]);
          }),
        )
        .subscribe(([items, scrollPosition]) => {
          if (scrollPosition === 'middle') {
            return;
          }
          const currentItems = this.virtualizedItemsSubject.getValue();
          if (items.length <= this.maxItemCount) {
            this.virtualizedItemsSubject.next(items);
          } else {
            let startIndex = 0;
            let endIndex = undefined;
            const numberOfItemsToRemove =
              items.length - Math.round(this.maxItemCount / 2);
            const numberOfItemsAfterRemove =
              items.length - numberOfItemsToRemove;
            switch (scrollPosition) {
              case 'top':
                if (currentItems.length > 0) {
                  const middleIndex = items.findIndex((i) =>
                    this.isEqual(i, currentItems[0]),
                  );
                  if (middleIndex !== -1) {
                    startIndex = Math.max(
                      0,
                      middleIndex - Math.ceil(numberOfItemsAfterRemove / 2),
                    );
                    endIndex = startIndex + numberOfItemsAfterRemove;
                  }
                } else {
                  endIndex = numberOfItemsAfterRemove;
                }
                break;
              case 'bottom':
                if (currentItems.length > 0) {
                  const middleIndex = items.findIndex((i) =>
                    this.isEqual(i, currentItems[currentItems.length - 1]),
                  );
                  if (middleIndex !== -1) {
                    endIndex = Math.min(
                      items.length,
                      middleIndex +
                        Math.floor(numberOfItemsAfterRemove / 2) +
                        1,
                    );
                    startIndex = endIndex - numberOfItemsAfterRemove;
                  }
                } else {
                  startIndex = items.length - numberOfItemsAfterRemove;
                }
                break;
            }
            const virtualizedItems = items.slice(startIndex, endIndex);
            this.virtualizedItemsSubject.next(virtualizedItems);
          }
        }),
    );
    this.subscriptions.push(
      this.scrollPosition$
        .pipe(distinctUntilChanged())
        .subscribe((position) => {
          if (
            this.queryStateSubject.getValue().state === `loading-${position}`
          ) {
            return;
          }
          if (position === 'top') {
            if (this.bufferOnTop < this.pageSize) {
              void this.loadMore(position);
            } else {
              this.loadMoreFromBuffer('top');
            }
          } else if (position === 'bottom') {
            if (this.bufferOnBottom < this.pageSize) {
              void this.loadMore(position);
            } else {
              this.loadMoreFromBuffer('bottom');
            }
          }
        }),
    );
    this.subscriptions.push(
      this.allItems$
        .pipe(
          pairwise(),
          filter(() => {
            let scrollPosition!: VirtualizedListScrollPosition;
            this.scrollPosition$
              .pipe(take(1))
              .subscribe((s) => (scrollPosition = s));
            return scrollPosition === 'middle';
          }),
        )
        .subscribe(([prevItems, currentItems]) => {
          if (
            currentItems.length < this.maxItemCount ||
            this.virtualizedItems.length === 0
          ) {
            this.virtualizedItemsSubject.next(currentItems);
          } else {
            const currentFirstItem = this.virtualizedItems[0];
            const currentLastItem =
              this.virtualizedItems[this.virtualizedItems.length - 1];
            const prevStartIndex = prevItems.findIndex((i) =>
              this.isEqual(i, currentFirstItem),
            );
            const prevEndIndex = prevItems.findIndex((i) =>
              this.isEqual(i, currentLastItem),
            );

            const isStartRemainedSame = currentItems[prevStartIndex]
              ? this.isEqual(currentItems[prevStartIndex], currentFirstItem)
              : false;
            const isEndRemainedSame = currentItems[prevEndIndex]
              ? this.isEqual(currentItems[prevEndIndex], currentLastItem)
              : false;

            const hasNewItemsBottom =
              prevEndIndex === prevItems.length - 1 && isEndRemainedSame
                ? prevItems.length !== currentItems.length
                : false;

            if (isStartRemainedSame && isEndRemainedSame) {
              const endIndex = hasNewItemsBottom ? undefined : prevEndIndex + 1;
              this.virtualizedItemsSubject.next(
                currentItems.slice(prevStartIndex, endIndex),
              );
            }

            let currentStartIndex = isStartRemainedSame ? prevStartIndex : -1;
            let currentEndIndex = isEndRemainedSame ? prevEndIndex : -1;

            if (!isStartRemainedSame) {
              currentStartIndex = currentItems.findIndex((i) =>
                this.isEqual(i, currentFirstItem),
              );
            }
            if (!isEndRemainedSame) {
              currentEndIndex = currentItems.findIndex((i) =>
                this.isEqual(i, currentLastItem),
              );
            }

            const hasNewItemsTop =
              prevStartIndex === 0 && !isStartRemainedSame
                ? currentStartIndex !== 0
                : false;

            if (currentStartIndex !== -1 && currentEndIndex !== -1) {
              const startIndex = hasNewItemsTop ? 0 : currentStartIndex;
              this.virtualizedItemsSubject.next(
                currentItems.slice(startIndex, currentEndIndex + 1),
              );
            } else {
              if (currentStartIndex === -1 && currentEndIndex !== -1) {
                currentStartIndex = Math.max(
                  0,
                  currentEndIndex - (prevEndIndex - prevStartIndex),
                );
              }

              if (currentEndIndex === -1 && currentStartIndex !== -1) {
                currentEndIndex = Math.min(
                  currentItems.length - 1,
                  currentStartIndex + (prevEndIndex - prevStartIndex),
                );
              }

              this.virtualizedItemsSubject.next(
                currentItems.slice(currentStartIndex, currentEndIndex + 1),
              );
            }
          }
        }),
    );
    if (this.jumpToItem$) {
      this.subscriptions.push(
        this.jumpToItem$
          .pipe(
            switchMap((jumpToItem) =>
              combineLatest([this.allItems$.pipe(take(1)), of(jumpToItem)]),
            ),
          )
          .subscribe(([allItems, jumpToItem]) => {
            if (jumpToItem.item) {
              if (allItems.length < this.maxItemCount) {
                this.virtualizedItemsSubject.next(allItems);
              } else {
                const itemIndex = allItems.findIndex((i) =>
                  // @ts-expect-error TODO: do we know a better typing here?
                  this.isEqual(i, jumpToItem.item),
                );
                if (itemIndex === -1) {
                  return;
                } else {
                  const position = jumpToItem.position || 'middle';
                  const numberOfItemsToRemove =
                    allItems.length - Math.round(this.maxItemCount / 2);
                  const numberOfItemsAfterRemove =
                    allItems.length - numberOfItemsToRemove;
                  let startIndex = -1;
                  let endIndex = -1;

                  switch (position) {
                    case 'top':
                      startIndex = itemIndex;
                      endIndex = Math.min(
                        allItems.length,
                        startIndex + numberOfItemsAfterRemove,
                      );
                      break;
                    case 'bottom':
                      endIndex = itemIndex + 1;
                      startIndex = Math.max(
                        0,
                        endIndex - numberOfItemsAfterRemove,
                      );
                      break;
                    case 'middle': {
                      const itemsOnTop = itemIndex;
                      const itemsOnBottom = allItems.length - itemIndex;
                      if (
                        itemsOnTop < Math.ceil(numberOfItemsAfterRemove / 2)
                      ) {
                        startIndex = 0;
                      }
                      if (
                        itemsOnBottom <
                        Math.floor(numberOfItemsAfterRemove / 2) + 1
                      ) {
                        endIndex = allItems.length;
                      }

                      if (startIndex === -1) {
                        if (endIndex !== -1) {
                          startIndex = endIndex - numberOfItemsAfterRemove;
                        } else {
                          startIndex =
                            itemIndex - Math.ceil(numberOfItemsAfterRemove / 2);
                        }
                      }

                      if (endIndex === -1) {
                        endIndex = startIndex + numberOfItemsAfterRemove;
                      }
                    }
                  }

                  this.virtualizedItemsSubject.next(
                    allItems.slice(startIndex, endIndex),
                  );
                }
              }
            }
          }),
      );
    }
  }

  /**
   * The current value of virtualized items
   */
  get virtualizedItems() {
    return this.virtualizedItemsSubject.getValue();
  }

  /**
   * Remove all subscriptions, call this once you're done using an instance of this service
   */
  dispose() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  protected loadMoreFromBuffer(_: VirtualizedListQueryDirection) {
    this.loadFromBuffer$.next();
  }

  private async loadMore(direction: VirtualizedListQueryDirection) {
    this.queryStateSubject.next({ state: `loading-${direction}` });
    try {
      await this.query(direction);
      this.queryStateSubject.next({ state: 'success' });
    } catch (e) {
      this.queryStateSubject.next({ state: 'error', error: e });
    }
  }

  protected abstract isEqual: (t1: T, t2: T) => boolean;

  protected abstract query: (
    direction: VirtualizedListQueryDirection,
  ) => Promise<unknown>;
}

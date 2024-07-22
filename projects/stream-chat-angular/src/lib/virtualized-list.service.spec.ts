import { BehaviorSubject } from 'rxjs';
import { VirtualizedListService } from './virtualized-list.service';
import { fakeAsync, tick } from '@angular/core/testing';
import {
  VirtualizedListQueryDirection,
  VirtualizedListScrollPosition,
  VirtualizedListVerticalItemPosition,
} from './types';

type Item = {
  id: string;
  value: number;
};

class TestVirualizedList extends VirtualizedListService<Item> {
  protected query = async (direction: VirtualizedListQueryDirection) => {
    let startValue =
      this.virtualizedItems[
        direction === 'top' ? 0 : this.virtualizedItems.length - 1
      ]?.value;
    if (direction === 'top') {
      startValue -= this.pageSize;
    }

    const newItems = new Array(this.pageSize)
      .fill(null)
      .map((_, i) => ({ id: `${startValue + i}`, value: startValue + i }));

    await Promise.resolve();

    // @ts-expect-error white-box test
    this['allItems$'].next([
      ...(direction === 'top' ? newItems : []),
      // @ts-expect-error white-box test
      ...this['allItems$'].getValue(),
      ...(direction === 'bottom' ? newItems : []),
    ]);
  };
  protected isEqual = (t1: Item, t2: Item) => t1.id === t2.id;
}

describe('VirtualizedListService', () => {
  let service: TestVirualizedList;
  let allItems$: BehaviorSubject<Item[]>;
  let scrollPosition$: BehaviorSubject<VirtualizedListScrollPosition>;
  let jumpToItem$: BehaviorSubject<{
    item: Partial<Item> | undefined;
    position?: VirtualizedListVerticalItemPosition;
  }>;

  beforeEach(() => {
    allItems$ = new BehaviorSubject<Item[]>([]);
    jumpToItem$ = new BehaviorSubject<{
      item: Partial<Item> | undefined;
      position?: VirtualizedListVerticalItemPosition;
    }>({ item: undefined });
    scrollPosition$ = new BehaviorSubject<VirtualizedListScrollPosition>(
      'bottom'
    );
    service = new TestVirualizedList(allItems$, scrollPosition$, jumpToItem$);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit items', () => {
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);

    allItems$.next([{ id: '0', value: 0 }]);

    expect(spy).toHaveBeenCalledWith([{ id: '0', value: 0 }]);

    allItems$.next([
      { id: '0', value: 0 },
      { id: '1', value: 1 },
    ]);

    expect(spy).toHaveBeenCalledWith([
      { id: '0', value: 0 },
      { id: '1', value: 1 },
    ]);
  });

  it('should remove items from the list if limit is reached', () => {
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);
    const items = new Array(service.maxItemCount)
      .fill(() => null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items);

    expect(spy).toHaveBeenCalledWith(items);

    const lastItem = items[items.length - 1];
    items.push({ id: `${lastItem.id + 1}`, value: lastItem.value + 1 });
    spy.calls.reset();
    allItems$.next(items);
    const virtualizedItems = spy.calls.mostRecent().args[0];

    expect(virtualizedItems.length).toBe(Math.round(service.maxItemCount) / 2);
    expect(items.length).toBe(service.maxItemCount + 1);
  });

  it('should remove items based on scroll postiion', () => {
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);
    const items = new Array(service.maxItemCount)
      .fill(() => null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items);

    expect(spy).toHaveBeenCalledWith(items);

    const lastItem = items[items.length - 1];
    items.push({ id: `${+lastItem.id + 1}`, value: lastItem.value + 1 });
    spy.calls.reset();
    allItems$.next(items);
    let virtualizedItems = spy.calls.mostRecent().args[0];

    expect(virtualizedItems).toEqual(items.slice(51));

    service['virtualizedItemsSubject'].next([]);
    scrollPosition$.next('top');
    virtualizedItems = spy.calls.mostRecent().args[0];

    expect(virtualizedItems).toEqual(items.slice(0, 50));
  });

  it(`should remove items based on what's currently displayed`, () => {
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);
    const items = new Array(service.maxItemCount * 5)
      .fill(() => null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    service['virtualizedItemsSubject'].next(
      items.slice(10, 10 + Math.round(service.maxItemCount / 2))
    );
    spy.calls.reset();
    allItems$.next(items);

    let virtualizedItems = spy.calls.mostRecent().args[0];

    expect(virtualizedItems).toEqual(items.slice(35, 85));

    spy.calls.reset();
    scrollPosition$.next('top');

    virtualizedItems = spy.calls.mostRecent().args[0];

    expect(virtualizedItems).toEqual(items.slice(10, 60));
  });

  it('should load prev/next pages from network', fakeAsync(() => {
    // @ts-expect-error white-box test
    spyOn(service, 'query').and.callThrough();
    const items = new Array(service.pageSize)
      .fill(() => null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items);
    scrollPosition$.next('top');

    expect(service['query']).toHaveBeenCalledWith('top');

    tick();

    expect(service.virtualizedItems.length).toEqual(service.pageSize * 2);

    scrollPosition$.next('bottom');

    expect(service['query']).toHaveBeenCalledWith('bottom');
  }));

  it(`should be able to paginate throguh a list with 147 items`, fakeAsync(() => {
    const numberOfItems = 147;
    const items = new Array(service.pageSize)
      .fill(() => null)
      .map((_, i) => ({
        id: `${i}`,
        value: numberOfItems - (service.pageSize - i),
      }));
    allItems$.next(items);

    // First page
    expect(service.virtualizedItems).toEqual(items);
    expect(service.virtualizedItems[0].value).toEqual(122);
    expect(
      service.virtualizedItems[service.virtualizedItems.length - 1].value
    ).toEqual(146);
    expect(service.virtualizedItems.length).toBe(25);

    scrollPosition$.next('top');
    tick();

    // Scrolling up, second page
    expect(service.virtualizedItems).toEqual(allItems$.getValue());
    expect(service.virtualizedItems[0].value).toEqual(97);
    expect(
      service.virtualizedItems[service.virtualizedItems.length - 1].value
    ).toEqual(146);
    expect(service.virtualizedItems.length).toBe(50);

    scrollPosition$.next('middle');
    scrollPosition$.next('top');
    tick();

    // Scrolling up, third page
    expect(service.virtualizedItems).toEqual(allItems$.getValue());
    expect(service.virtualizedItems[0].value).toEqual(72);
    expect(
      service.virtualizedItems[service.virtualizedItems.length - 1].value
    ).toEqual(146);
    expect(service.virtualizedItems.length).toBe(75);

    scrollPosition$.next('middle');
    scrollPosition$.next('top');
    tick();

    // Scrolling up, fourth page
    expect(service.virtualizedItems).toEqual(allItems$.getValue());
    expect(service.virtualizedItems[0].value).toEqual(47);
    expect(
      service.virtualizedItems[service.virtualizedItems.length - 1].value
    ).toEqual(146);
    expect(service.virtualizedItems.length).toBe(100);

    scrollPosition$.next('middle');
    scrollPosition$.next('top');
    tick();

    // Scrolling up, fifth page
    expect(service.virtualizedItems).toEqual(allItems$.getValue().slice(0, 50));
    expect(service.virtualizedItems[0].value).toEqual(22);
    expect(
      service.virtualizedItems[service.virtualizedItems.length - 1].value
    ).toEqual(71);
    expect(service.virtualizedItems.length).toBe(50);

    //@ts-expect-error white-box test
    const querySpy = spyOn(service, 'query').and.callFake(() => {
      allItems$.next(
        new Array(147).fill(null).map((_, i) => ({ id: `${i}`, value: i }))
      );
    });
    scrollPosition$.next('middle');
    scrollPosition$.next('top');

    // Scrolling up, sixth (last) page
    expect(service.virtualizedItems).toEqual(allItems$.getValue().slice(0, 50));
    expect(service.virtualizedItems[0].value).toEqual(0);
    expect(
      service.virtualizedItems[service.virtualizedItems.length - 1].value
    ).toEqual(49);
    expect(service.virtualizedItems.length).toBe(50);

    querySpy.calls.reset();
    scrollPosition$.next('bottom');

    // Scrolling down, fifth page
    expect(querySpy).not.toHaveBeenCalled();

    expect(service.virtualizedItems).toEqual(
      allItems$.getValue().slice(25, 75)
    );
    expect(service.virtualizedItems[0].value).toEqual(25);
    expect(
      service.virtualizedItems[service.virtualizedItems.length - 1].value
    ).toEqual(74);
    expect(service.virtualizedItems.length).toBe(50);

    scrollPosition$.next('middle');
    scrollPosition$.next('bottom');

    // Scrolling down, fourth page
    expect(querySpy).not.toHaveBeenCalled();

    expect(service.virtualizedItems).toEqual(
      allItems$.getValue().slice(50, 100)
    );
    expect(service.virtualizedItems[0].value).toEqual(50);
    expect(
      service.virtualizedItems[service.virtualizedItems.length - 1].value
    ).toEqual(99);
    expect(service.virtualizedItems.length).toBe(50);

    scrollPosition$.next('middle');
    scrollPosition$.next('bottom');

    // Scrolling down, fifth page
    expect(querySpy).not.toHaveBeenCalled();

    expect(service.virtualizedItems).toEqual(
      allItems$.getValue().slice(75, 125)
    );
    expect(service.virtualizedItems[0].value).toEqual(75);
    expect(
      service.virtualizedItems[service.virtualizedItems.length - 1].value
    ).toEqual(124);
    expect(service.virtualizedItems.length).toBe(50);

    // @ts-expect-error white-box test
    querySpy.and.callFake(() => {
      allItems$.next(allItems$.getValue());
    });
    scrollPosition$.next('middle');
    scrollPosition$.next('bottom');

    // Scrolling down, first page
    expect(service['query']).toHaveBeenCalledWith('bottom');

    expect(service.virtualizedItems).toEqual(
      allItems$.getValue().slice(97, 147)
    );
    expect(service.virtualizedItems[0].value).toEqual(97);
    expect(
      service.virtualizedItems[service.virtualizedItems.length - 1].value
    ).toEqual(146);
    expect(service.virtualizedItems.length).toBe(50);
  }));

  it('should emit query state', fakeAsync(() => {
    const spy = jasmine.createSpy();
    service.queryState$.subscribe(spy);
    spy.calls.reset();

    void service['loadMore']('top');

    expect(spy).toHaveBeenCalledWith({ state: 'loading-top' });

    tick();

    expect(spy).toHaveBeenCalledWith({ state: 'success' });

    const error = new Error('query failed');
    // @ts-expect-error white-box test
    spyOn(service, 'query').and.rejectWith(error);

    void service['loadMore']('bottom');

    expect(spy).toHaveBeenCalledWith({ state: 'loading-top' });
    tick();

    expect(spy).toHaveBeenCalledWith({ state: 'error', error: error });
  }));

  it(`should emit virtualized list if scroll postion is middle, and an item is updated`, () => {
    scrollPosition$.next('middle');
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);
    const items = [
      { id: '1', value: 1 },
      { id: '1', value: 2 },
    ];
    allItems$.next(items);
    spy.calls.reset();
    items[0] = { id: items[0].id, value: 12121212 };
    allItems$.next(items);

    expect(spy).toHaveBeenCalledWith(jasmine.arrayContaining([items[0]]));
  });

  it(`should extend virtualized list even if new items inserted in the scope`, () => {
    const items = new Array(service.maxItemCount + 2)
      .fill(null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items);
    scrollPosition$.next('middle');
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);
    const newItems = [
      ...items.slice(0, items.length - service.virtualizedItems.length + 5),
      { id: 'instered-element', value: 43534534 },
      ...items.slice(items.length - service.virtualizedItems.length + 5),
    ];

    expect(service.virtualizedItems.length).toBe(50);

    spy.calls.reset();
    allItems$.next(newItems);

    expect(spy).toHaveBeenCalledWith(newItems.slice(52));
  });

  it('should extend virtualized list if it displays bottom of the list, and new items are added to the bottom', () => {
    const items = new Array(service.maxItemCount + 2)
      .fill(null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items);
    scrollPosition$.next('middle');
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);

    expect(service.virtualizedItems.length).toBe(50);

    spy.calls.reset();
    allItems$.next([...items, { id: 'new-item-inserted', value: 3422434 }]);

    expect(spy).toHaveBeenCalledWith(
      jasmine.arrayContaining([{ id: 'new-item-inserted', value: 3422434 }])
    );
  });

  it('should extend virtualized list if it displays top of the list, and new items are added to the top', () => {
    const items = new Array(service.maxItemCount + 2)
      .fill(null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    scrollPosition$.next('top');
    allItems$.next(items);
    scrollPosition$.next('middle');
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);

    expect(service.virtualizedItems.length).toBe(50);

    spy.calls.reset();
    allItems$.next([{ id: 'new-item-inserted', value: 3422434 }, ...items]);

    expect(spy).toHaveBeenCalledWith(
      jasmine.arrayContaining([{ id: 'new-item-inserted', value: 3422434 }])
    );
  });

  it(`should not extend virtualized list if scroll position is middle, and changes occur outside`, () => {
    const items = new Array(service.maxItemCount + 2)
      .fill(null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items);
    scrollPosition$.next('middle');
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);

    expect(service.virtualizedItems.length).toBe(50);

    spy.calls.reset();
    allItems$.next([{ id: 'new-item-inserted', value: 3422434 }, ...items]);

    expect(spy).not.toHaveBeenCalledWith(
      jasmine.arrayContaining([{ id: 'new-item-inserted', value: 3422434 }])
    );
  });

  it(`should handle if previous start of virtualized list is deleted`, () => {
    const items = new Array(service.maxItemCount + 2)
      .fill(null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items);
    scrollPosition$.next('middle');
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(items.slice(52));

    spy.calls.reset();
    const newItems = [...items];
    newItems.splice(52, 1);
    allItems$.next(newItems);

    expect(spy).toHaveBeenCalledWith(newItems.slice(51));
  });

  it(`should handle if previous end of virtualized list is deleted`, () => {
    const items = new Array(service.maxItemCount + 2)
      .fill(null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items);
    scrollPosition$.next('middle');
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(items.slice(52));

    spy.calls.reset();
    const newItems = [...items];
    newItems.splice(newItems.length - 1, 1);
    allItems$.next(newItems);

    expect(spy).toHaveBeenCalledWith(newItems.slice(52));
  });

  it('should jump to item', () => {
    const items = new Array(10)
      .fill(null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items);
    jumpToItem$.next({ item: { id: items[0].id } });

    expect(service.virtualizedItems).toEqual(items);

    const items2 = new Array(service.maxItemCount * 2)
      .fill(null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items2);
  });

  it('should jump to item and remove items', () => {
    const items = new Array(service.maxItemCount * 2)
      .fill(null)
      .map((_, i) => ({ id: `${i}`, value: i }));
    allItems$.next(items);
    jumpToItem$.next({ item: { id: items[items.length - 1].id } });

    expect(service.virtualizedItems.length).toEqual(50);
    expect(service.virtualizedItems).toEqual(items.slice(150));

    jumpToItem$.next({ item: { id: items[10].id }, position: 'top' });

    expect(service.virtualizedItems.length).toEqual(50);
    expect(service.virtualizedItems).toEqual(items.slice(10, 60));

    jumpToItem$.next({ item: { id: items[10].id }, position: 'middle' });

    expect(service.virtualizedItems.length).toEqual(50);
    expect(service.virtualizedItems).toEqual(items.slice(0, 50));

    jumpToItem$.next({ item: { id: items[33].id }, position: 'bottom' });

    expect(service.virtualizedItems.length).toEqual(34);
    expect(service.virtualizedItems).toEqual(items.slice(0, 34));
  });

  it('should dispose', () => {
    const spy = jasmine.createSpy();
    service.virtualizedItems$.subscribe(spy);
    spy.calls.reset();
    service.dispose();
    allItems$.next([{ id: '0', value: 0 }]);

    expect(spy).not.toHaveBeenCalled();
  });
});

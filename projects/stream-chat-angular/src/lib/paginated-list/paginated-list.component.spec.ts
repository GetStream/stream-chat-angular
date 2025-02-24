import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { PaginatedListComponent } from './paginated-list.component';
import { Component } from '@angular/core';

describe('PaginatedListComponentt', () => {
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  @Component({
    selector: 'stream-test-componetn',
    template: `<stream-paginated-list
      [items]="items"
      [hasMore]="hasMore"
      [isLoading]="isLoading"
      [trackBy]="trackBy"
      (loadMore)="loadMore()"
    >
      <ng-template let-item="item" let-index="index"
        ><div data-testid="test-item" [style.height]="height">
          {{ index }}. {{ item }}
        </div></ng-template
      >
    </stream-paginated-list>`,
  })
  class TestHostComponent {
    items = ['apple', 'banana', 'orange'];
    hasMore = false;
    isLoading = false;
    height = '20px';

    loadMore = () => {};

    trackBy = (_: number, item: string) => item;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PaginatedListComponent, TestHostComponent],
      imports: [TranslateModule.forRoot()],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    hostFixture.detectChanges();
  });

  it('should display items', () => {
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelectorAll('[data-testid="item"]').length,
    ).toBe(3);

    const testItems = hostFixture.nativeElement.querySelectorAll(
      '[data-testid="test-item"]',
    );

    hostComponent.items.forEach((item, index) => {
      expect(testItems[index].textContent).toContain(`${index}. ${item}`);
    });
  });

  describe('load more button', () => {
    const queryLoadMore = () =>
      hostFixture.nativeElement.querySelector(
        '[data-testid="load-more-button"]',
      ) as HTMLButtonElement;

    it('should display load more button if #hasMore is true', () => {
      expect(queryLoadMore()).toBeNull();

      hostComponent.hasMore = true;
      hostFixture.detectChanges();

      expect(queryLoadMore()).not.toBeNull();
    });

    it('should disable load more button if loading is in progress', () => {
      hostComponent.hasMore = true;
      hostComponent.isLoading = true;
      hostFixture.detectChanges();

      expect(queryLoadMore().disabled).toBeTrue();

      hostComponent.isLoading = false;
      hostFixture.detectChanges();

      expect(queryLoadMore().disabled).toBeFalse();
    });

    it('should ask for more data if load more is clicked', () => {
      const spy = jasmine.createSpy();
      hostComponent.loadMore = spy;
      hostComponent.hasMore = true;
      hostFixture.detectChanges();

      queryLoadMore().click();
      hostFixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  it('should display loading indicator', () => {
    hostComponent.isLoading = true;
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector(
        '[data-testid="loading-indicator"]',
      ),
    ).not.toBeNull();

    hostComponent.isLoading = false;
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector(
        '[data-testid="loading-indicator"]',
      ),
    ).toBeNull();
  });

  describe('infinite scrolling', () => {
    let scrollContainer: HTMLElement;

    beforeEach(() => {
      hostComponent.height = '200px';
      scrollContainer = hostFixture.nativeElement.querySelector(
        '.stream-chat__paginated-list',
      ) as HTMLElement;
      scrollContainer.style.height = '500px';
      scrollContainer.style.overflowY = 'auto';
      hostFixture.detectChanges();
    });

    it(`shouldn't display load more button if scrollbar is visible`, () => {
      expect(
        hostFixture.nativeElement.querySelector(
          '[data-testid="load-more-button"]',
        ) as HTMLButtonElement,
      ).toBeNull();
    });

    it('should load next page if user scrolls to bottom', () => {
      const spy = jasmine.createSpy();
      hostComponent.loadMore = spy;
      hostComponent.hasMore = true;
      hostFixture.detectChanges();

      expect(spy).not.toHaveBeenCalledWith();

      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight - scrollContainer.clientHeight,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      hostFixture.detectChanges();

      expect(spy).toHaveBeenCalledOnceWith();
    });

    it(`shouldn't load next page if loading is already in progress`, () => {
      const spy = jasmine.createSpy();
      hostComponent.loadMore = spy;
      hostComponent.hasMore = true;
      hostComponent.isLoading = true;
      hostFixture.detectChanges();

      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight - scrollContainer.clientHeight,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      hostFixture.detectChanges();

      expect(spy).not.toHaveBeenCalledWith();
    });
  });
});

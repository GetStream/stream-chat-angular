import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  Output,
  TemplateRef,
  TrackByFunction,
  ViewChild,
} from '@angular/core';

/**
 * The `PaginatedListComponent` is a utility element that can display a list of any items. It uses infinite scrolls to load more elements. Providing the data to display, is the responsibility of the parent component.
 */
@Component({
  selector: 'stream-paginated-list',
  templateUrl: './paginated-list.component.html',
  styles: [],
})
export class PaginatedListComponent<T> implements AfterViewInit {
  /**
   * The items to display
   */
  @Input() items: T[] = [];
  /**
   * If `true`, the loading indicator will be displayed
   */
  @Input() isLoading = false;
  /**
   * If `false` the component won't ask for more data vua the `loadMore` output
   */
  @Input() hasMore = false;
  /**
   * The `trackBy` to use with the `NgFor` directive
   * @param i
   * @returns the track by id
   */
  @Input() trackBy: TrackByFunction<T> = (i) => i;
  @ContentChild(TemplateRef) itemTempalteRef:
    | TemplateRef<{ item: T; index: number }>
    | undefined;
  /**
   * The component will signal via this output when more items should be fetched
   *
   * The new items should be appended to the `items` array
   */
  @Output() readonly loadMore = new EventEmitter<void>();
  isScrollable = false;
  isAtBottom = false;
  @ViewChild('container')
  private scrollContainer!: ElementRef<HTMLElement>;

  constructor(
    private ngZone: NgZone,
    private cdRef: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.scrollContainer?.nativeElement?.addEventListener('scroll', () =>
        this.scrolled(),
      );
    });
  }

  private scrolled() {
    if (!this.hasMore) {
      return;
    }

    const isScrollable =
      this.scrollContainer.nativeElement.scrollHeight >
      this.scrollContainer.nativeElement.clientHeight;

    if (this.isScrollable !== isScrollable) {
      this.ngZone.run(() => {
        this.isScrollable = isScrollable;
        this.cdRef.detectChanges();
      });
    }
    const isAtBottom =
      Math.ceil(this.scrollContainer.nativeElement.scrollTop) +
        this.scrollContainer.nativeElement.clientHeight +
        1 >=
      this.scrollContainer.nativeElement.scrollHeight;
    if (this.isAtBottom !== isAtBottom) {
      this.ngZone.run(() => {
        this.isAtBottom = isAtBottom;
        if (this.isAtBottom && !this.isLoading) {
          this.loadMore.emit();
        }
        this.cdRef.detectChanges();
      });
    }
  }
}

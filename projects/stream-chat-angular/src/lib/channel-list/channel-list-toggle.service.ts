import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, filter, first } from 'rxjs/operators';

/**
 * The `ChannelListToggleService` can be used to toggle the channel list.
 *
 * @deprecated This service can only be used with [theming-v1](../concepts/theming-and-css.mdx), if you are using [thmeing-v2](../theming/introduction.mdx) please refer to our [responsive layout guide](../code-examples/responsive-layout.mdx)
 */
@Injectable({ providedIn: 'root' })
export class ChannelListToggleService {
  /**
   * Emits `true` if the channel list is in open state, otherwise it emits `false`
   */
  isOpen$: Observable<boolean>;
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  private menuElement: HTMLElement | undefined;

  constructor() {
    this.isOpen$ = this.isOpenSubject
      .asObservable()
      .pipe(distinctUntilChanged());
    this.isOpen$.pipe(filter((s) => s)).subscribe(() => {
      this.watchForOutsideClicks();
    });
  }

  /**
   * Opens the channel list.
   */
  open() {
    this.isOpenSubject.next(true);
  }

  /**
   * Closes the channel list.
   */
  close() {
    this.isOpenSubject.next(false);
  }

  /**
   * Opens the channel list if it was closed, and closes if it was opened.
   */
  toggle() {
    this.isOpenSubject.getValue() ? this.close() : this.open();
  }

  /**
   * Sets the channel list element, on mobile screen size if the user opens the channel list, and clicks outside, the service automatically closes the channel list if a reference to the HTML element is provided.
   * @param element
   */
  setMenuElement(element: HTMLElement | undefined) {
    this.menuElement = element;
  }

  /**
   * This method should be called if a channel was selected, if on mobile, the channel list will be closed.
   */
  channelSelected() {
    this.close();
  }

  private watchForOutsideClicks() {
    if (!this.menuElement) {
      return;
    }
    const eventHandler = (event: Event) => {
      if (!this.menuElement!.contains(event.target as Node)) {
        this.close();
        window.removeEventListener('click', eventHandler);
      }
    };
    window.addEventListener('click', eventHandler);
    this.isOpen$
      .pipe(
        filter((s) => !s),
        first()
      )
      .subscribe(() => window.removeEventListener('click', eventHandler));
  }
}

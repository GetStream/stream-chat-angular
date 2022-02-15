import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, filter, first } from 'rxjs/operators';
import { getDeviceWidth } from '../device-width';

/**
 * The `ChannelListToggleService` can be used to toggle the channel list.
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
      if (getDeviceWidth().device === 'mobile') {
        this.watchForOutsideClicks();
      }
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
    if (getDeviceWidth().device === 'mobile') {
      this.close();
    }
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

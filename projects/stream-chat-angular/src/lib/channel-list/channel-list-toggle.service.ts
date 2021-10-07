import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, filter, first } from 'rxjs/operators';
import { getDeviceWidth } from '../device-width';

@Injectable({ providedIn: 'root' })
export class ChannelListToggleService {
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

  open() {
    this.isOpenSubject.next(true);
  }

  close() {
    this.isOpenSubject.next(false);
  }

  toggle() {
    this.isOpenSubject.getValue() ? this.close() : this.open();
  }

  setMenuElement(element: HTMLElement | undefined) {
    this.menuElement = element;
  }

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

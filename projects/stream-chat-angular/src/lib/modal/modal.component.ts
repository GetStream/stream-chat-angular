import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'stream-modal',
  templateUrl: './modal.component.html',
  styles: [],
})
export class ModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() readonly isOpenChange = new EventEmitter<boolean>();
  @ViewChild('content') private content: ElementRef<HTMLElement> | undefined;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isOpen) {
      if (this.isOpen) {
        window.addEventListener('keyup', this.watchForEscPress);
        setTimeout(
          () => window.addEventListener('click', this.watchForOutsideClicks),
          0
        );
      } else {
        this.stopWatchForOutsideClicks();
        this.stopWatchForEscPress();
      }
    }
  }

  close() {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.stopWatchForOutsideClicks();
    this.stopWatchForEscPress();
  }

  private watchForEscPress = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.close();
    }
  };

  private stopWatchForEscPress = () => {
    window.removeEventListener('keyup', this.watchForEscPress);
  };

  private watchForOutsideClicks = (event: Event) => {
    if (!this.content?.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  };

  private stopWatchForOutsideClicks() {
    window.removeEventListener('click', this.watchForOutsideClicks);
  }
}

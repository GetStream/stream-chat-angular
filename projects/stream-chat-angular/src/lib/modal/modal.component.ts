import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';

/**
 * The `Modal` component displays its content in an overlay. The modal can be closed with a close button, if the user clicks outside of the modal content, or if the escape button is pressed. The modal can also be closed from outside.
 */
@Component({
  selector: 'stream-modal',
  templateUrl: './modal.component.html',
  styles: [],
})
export class ModalComponent implements OnChanges {
  /**
   * If `true` the modal will be displayed, if `false` the modal will be hidden
   */
  @Input() isOpen = false;
  /**
   * The content of the modal  (can also be provided using `ng-content`)
   */
  @Input() content: TemplateRef<void> | undefined;
  /**
   * Emits `true` if the modal becomes visible, and `false` if the modal is closed.
   */
  @Output() readonly isOpenChange = new EventEmitter<boolean>();
  @ViewChild('modalInner') private innerContainer:
    | ElementRef<HTMLElement>
    | undefined;

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
    if (!this.innerContainer?.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  };

  private stopWatchForOutsideClicks() {
    window.removeEventListener('click', this.watchForOutsideClicks);
  }
}

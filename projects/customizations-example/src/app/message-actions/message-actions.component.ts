import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-message-actions',
  templateUrl: './message-actions.component.html',
  styleUrls: ['./message-actions.component.scss'],
})
export class MessageActionsComponent implements OnInit {
  @Output() readonly displayedActionsCount = new EventEmitter<number>();

  constructor() {}

  ngOnInit(): void {
    // Emit the number of available actions
    // If nothing or 0 is emitted the message actions won't be displayed by the message component
    this.displayedActionsCount.emit(6);
  }
}

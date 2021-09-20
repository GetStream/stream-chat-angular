import { Component, Input } from '@angular/core';

@Component({
  selector: 'stream-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent {
  @Input() name: string | undefined;
  @Input() imageUrl: string | undefined;
  @Input() size = 32;
  isLoaded = false;
  isError = false;

  constructor() {}

  get initials() {
    return (this.name?.toString() || '').charAt(0);
  }
}

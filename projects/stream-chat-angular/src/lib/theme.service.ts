import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * The `ThemeService` can be used to change the theme of the chat UI and to customize the theme. Our [theming guide](../theming/introduction.mdx) gives a complete overview about the topic.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  /**
   * A Subject that can be used to get or set the currently active theme. By default light and dark themes are supported.
   */
  theme$ = new BehaviorSubject<string>('light');

  constructor() {}
}

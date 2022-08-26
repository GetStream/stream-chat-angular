import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * The `ImageLoadService` is used to position the scrollbar in the message list
 * @deprecated - This class is no longer used by SDK components as image sizes are fixed
 */
@Injectable({
  providedIn: 'root',
})
export class ImageLoadService {
  /**
   * A subject that can be used to notify the message list if an image attachment finished loading
   */
  imageLoad$ = new Subject<void>();

  constructor() {}
}

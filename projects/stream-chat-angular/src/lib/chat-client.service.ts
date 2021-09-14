import { Injectable, NgZone } from '@angular/core';
import { StreamChat } from 'stream-chat';

@Injectable({
  providedIn: 'root',
})
export class ChatClientService {
  chatClient!: StreamChat;

  constructor(private ngZone: NgZone) {}

  init(apiKey: string, userId: string, userToken: string) {
    this.chatClient = StreamChat.getInstance(apiKey);
    void this.ngZone.runOutsideAngular(() =>
      this.chatClient.connectUser({ id: userId }, userToken)
    );
  }
}

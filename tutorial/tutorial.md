## Set Up Your Angular Environment

The easiest way to build a Stream Chat Angular application from this tutorial is to create a new project using Angular CLI. Angular CLI builds an Angular boilerplate application that you can run locally with just a few simple commands.

**Before you start**: Make sure you've installed the most recent versions of [Node.js](https://nodejs.org/en/) and [Angular CLI](https://angular.io/cli) globally.

Create a new application with Angular CLI:

```shell
ng new chat-example
```

We won't need routing in the application, and you can choose any stylesheet; the tutorial uses [SCSS](https://sass-lang.com/documentation/syntax#scss).

Install the necessary dependencies:

```shell
npm install stream-chat-angular stream-chat-css stream-chat @ngx-translate/core
```

## Create a WhatsApp or Facebook Messenger Style Chat App

Stream's Angular Chat messaging SDK component library includes everything you need to build a fully functioning chat experience, supporting rich messages, reactions, image uploads, and more. This library was designed to enable you to get an application up and running quickly and efficiently while supporting customization for complex use cases.

We’ve included a few Stream Angular Chat examples to show you what’s possible:

- Basic chat components cxample
- Themeing example
- Customizable UI components example

## Build a Basic Chat App with Stream’s Core Angular Components

In the sample below, you’ll find the following basic chat components of the Angular library:

- ChannelList
- Channel
- ChannelHeader
- MessageInput
- MessageList

To get started:

1. Import the modules

In your `AppModule` add the following imports:

```typescript
import { TranslateModule } from '@ngx-translate/core';
import { StreamChatModule } from 'stream-chat-angular';

@NgModule({
  imports: [
    TranslateModule.forRoot(),
    StreamChatModule
})
export class AppModule { }
```

If you already use [ngx-translate](https://github.com/ngx-translate/core) in your application, follow [this](https://getstream.io/chat/docs/sdk/angular/concepts/translation/) guide to set up translation.

2. Init the chat application

Replace the content of your `app.component.ts` with the following code:

```typescript
import { Component } from "@angular/core";
import {
  ChatClientService,
  ChannelService,
  StreamI18nService,
} from "stream-chat-angular";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  constructor(
    private chatService: ChatClientService,
    private channelService: ChannelService,
    private streamI18nService: StreamI18nService
  ) {
    const apiKey = "YOUR_API_KEY";
    const userId = "USER_ID";
    const userToken = "USERT_TOKEN";
    void this.chatService.init(apiKey, userId, userToken);
    this.chatService.chatClient.channel("messaging", "talking-about-angular", {
      // add as many custom fields as you'd like
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Angular_full_color_logo.svg/2048px-Angular_full_color_logo.svg.png",
      name: "Talking about Angular",
    });
    void this.channelService.init({
      type: "messaging",
      id: { $eq: "talking-about-angular" },
    });
    this.streamI18nService.setTranslation();
  }
}
```

First, we connect a user to the chat client. Further information about [connecting users](https://getstream.io/chat/docs/javascript/init_and_users/?language=javascript) is available in our platform documentation.

Next, we create a channel (if doesn't not exist) to test with. You can read more about [channel creation](https://getstream.io/chat/docs/javascript/creating_channels/?language=javascript) in out platform documentation.

Lastly, we provide a filter condition for loading channels. If you want to more about [filtering channels](https://getstream.io/chat/docs/javascript/query_channels/?language=javascript), our platform documentation got you covered.

We also set up the translation for the application. If you want to customize it, check out our [translation guide](https://getstream.io/chat/docs/sdk/angular/concepts/translation/).

3. Create the chat UI

Replace the content of the `app.component.html` with the following code:

```html
<stream-channel-list></stream-channel-list>
<stream-channel>
  <stream-channel-header></stream-channel-header>
  <stream-message-list></stream-message-list>
  <stream-notification-list></stream-notification-list>
  <stream-message-input></stream-message-input>
</stream-channel>
```

4. Import CSS

Add the following code to your root stylesheet (`styles.scss` if you are using SCSS):

```scss
@import "~stream-chat-css/dist/scss/index.scss";

body {
  margin: 0;
}
```

5. Modify `tsconfig.json`

Add the following option to the `compilerOptions` in `tsconfig.json` file:

```
"allowSyntheticDefaultImports": true
```

6. Start the application

Run the following command:

```shell
npm start
```

Once you have the app running, you’ll notice the following out-of-the-box features:

- User online presence
- Message status indicators (sending, received)
- User role configuration
- Message read indicators
- Message reactions
- URL previews (send a link to see it in action, for example, https://getstream.io/)
- File uploads and previews
- AI-powered spam and profanity moderation

### Customizing the theme

Stream Chat Angular supports dark and light themes, the default is the light theme, here is how you can switch to dark:

```typescript
import { Component } from "@angular/core";
import {
  ChatClientService,
  ChannelService,
  StreamI18nService,
  ThemeService,
} from "stream-chat-angular";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  constructor(
    private chatService: ChatClientService,
    private channelService: ChannelService,
    private streamI18nService: StreamI18nService,
    private themeService: ThemeService
  ) {
    const apiKey = "dz5f4d5kzrue";
    const userId = "ancient-smoke-7";
    const userToken =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiYW5jaWVudC1zbW9rZS03IiwiZXhwIjoxNjM1ODU5MjYwfQ.R_IfzT1WnnYj5M0lsasuasuD4OTlpyfEzum65XN05ig";
    void this.chatService.init(apiKey, userId, userToken);
    this.chatService.chatClient.channel("messaging", "talking-about-angular", {
      // add as many custom fields as you'd like
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Angular_full_color_logo.svg/2048px-Angular_full_color_logo.svg.png",
      name: "Talking about Angular",
    });
    void this.channelService.init({
      type: "messaging",
      id: { $eq: "talking-about-angular" },
    });
    this.streamI18nService.setTranslation();
    this.themeService.theme$.next("dark");
  }
}
```

If you want to know more about themeing and customization, check out our [themeing guide](https://getstream.io/chat/docs/sdk/angular/concepts/themeing/).

### Creating Your Own UI Components

If the built-in theming capabilities are not enough for you, you can create your own custom components.

In the below example, you’ll create custom `ChannelPreview` and `Message` components.

1. Create the `Message` component

Run the following command:

```shell
ng g c message --inline-style --inline-template
```

2. Implement the `Message` component

Replace the content of the `message.component.ts` with the following code:

```typescript
import { Component, Input } from "@angular/core";
import { StreamMessage } from "stream-chat-angular";

@Component({
  selector: "app-message",
  template: `
    <div>
      <b>{{ message?.user?.name }}</b> {{ message?.text }}
    </div>
  `,
  styles: ["b {margin-right: 4px}"],
})
export class MessageComponent {
  @Input() message: StreamMessage | undefined;
  constructor() {}
}
```

3. Use the custom message component

Provide the `customMessageTemplate` to the `stream-message-list` component:

```html
<stream-channel-list></stream-channel-list>
<stream-channel>
  <stream-channel-header></stream-channel-header>
  <stream-message-list
    [messageTemplate]="customMessagetemplate"
  ></stream-message-list>
  <stream-notification-list></stream-notification-list>
  <stream-message-input></stream-message-input>
</stream-channel>

<ng-template #customMessagetemplate let-message="message">
  <app-message [message]="message"></app-message>
</ng-template>
```

4. Create the `ChannelPreview` component

Run the following command:

```shell
ng g c channel-preview --inline-style --inline-template
```

5. Implement the `ChannelPreview` component

Replace the content of the `channel-preview.component.ts` with the following code:

```typescript
import { Component, Input, OnChanges } from "@angular/core";
import { Channel } from "stream-chat";
import { ChannelService } from "stream-chat-angular";

@Component({
  selector: "app-channel-preview",
  template: `
    <div class="container" (click)="setAsActiveChannel()">
      <div>{{ channel?.data?.name || "Unnamed Channel" }}</div>
      <div class="preview">{{ messagePreview }}</div>
    </div>
  `,
  styles: [".container {margin: 12px}", ".preview {font-size: 14px}"],
})
export class ChannelPreviewComponent implements OnChanges {
  @Input() channel: Channel | undefined;
  messagePreview: string | undefined;

  constructor(private channelService: ChannelService) {}

  ngOnChanges(): void {
    const messages = this?.channel?.state?.messages;
    if (!messages) {
      return;
    }
    this.messagePreview = messages[messages.length - 1].text?.slice(0, 30);
  }

  setAsActiveChannel() {
    void this.channelService.setAsActiveChannel(this.channel!);
  }
}
```

6. Use the custom channel preview component

Provide the `customChannelPreviewtemplate` to the `stream-channel-list` component:

```html
<stream-channel-list
  [customChannelPreviewTemplate]="customChannelPreviewtemplate"
></stream-channel-list>
<stream-channel>
  <stream-channel-header></stream-channel-header>
  <stream-message-list
    [messageTemplate]="customMessagetemplate"
  ></stream-message-list>
  <stream-notification-list></stream-notification-list>
  <stream-message-input></stream-message-input>
</stream-channel>

<ng-template #customMessagetemplate let-message="message">
  <app-message [message]="message"></app-message>
</ng-template>

<ng-template #customChannelPreviewtemplate let-channel="channel">
  <app-channel-preview [channel]="channel"></app-channel-preview>
</ng-template>
```

### References

To learn more about the Angular SDK, check our SDK documentation and guides:

- Our [documentation](https://getstream.io/chat/docs/sdk/angular/)
- [Themeing guide](https://getstream.io/chat/docs/sdk/angular/concepts/themeing/)
- [Translation guide](https://getstream.io/chat/docs/sdk/angular/concepts/translation/)

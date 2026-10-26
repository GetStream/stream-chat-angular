# Migration guide: stream-chat v9 → v10

This release of `stream-chat-angular` is built on `stream-chat` (the JavaScript client, also called the LLC) v10. Most of the SDK's own API (components, services, templates) is unchanged, but some types and behaviors changed because v10 changed its data model.

This guide lists every breaking change in `stream-chat-angular`. If your app calls the `stream-chat` client directly (`chatService.chatClient`, `channel.*`, `client.*`), you also need the [stream-chat v10 breaking changes](https://github.com/GetStream/stream-chat-js/blob/release-v10/ai-docs/v10-breaking-changes.md); the most common ones are summarized in [Direct usage of the stream-chat client](#direct-usage-of-the-stream-chat-client).

## Contents

1. [Installation and requirements](#installation-and-requirements)
2. [Client initialization (`ChatClientService.init`)](#client-initialization-chatclientserviceinit)
3. [Connection state](#connection-state)
4. [Channel list (`ChannelService.init`, custom queries, filters, sort)](#channel-list)
5. [Custom data moved under `custom`](#custom-data-moved-under-custom)
6. [`StreamMessage` and other message types](#streammessage-and-other-message-types)
7. [Message list, pagination, and jumping to messages](#message-list-pagination-and-jumping-to-messages)
8. [Threads](#threads)
9. [Custom event handlers and setters](#custom-event-handlers-and-setters)
10. [Attachments and voice recordings](#attachments-and-voice-recordings)
11. [Message input and drafts](#message-input-and-drafts)
12. [Polls](#polls)
13. [Reactions](#reactions)
14. [Moderation (bounced and blocked messages)](#moderation-bounced-and-blocked-messages)
15. [Other type changes](#other-type-changes)
16. [Translations](#translations)
17. [Behavior changes](#behavior-changes)
18. [New APIs](#new-apis)
19. [Direct usage of the stream-chat client](#direct-usage-of-the-stream-chat-client)

## Installation and requirements

- Install `stream-chat` v10. The SDK's peer dependency changed from `^9.20.0` to `^10.0.0`:

  ```bash
  npm install stream-chat@^10
  ```

- `stream-chat` v10 requires Node.js `>=22.18.0` for installation and builds (`engines.node`).
- TypeScript: `stream-chat` v10 type definitions work with TypeScript 5.2–5.4 (the range supported by Angular 17), and later versions.

## Client initialization (`ChatClientService.init`)

### Client options

The `clientOptions` parameter is now the `stream-chat` v10 configuration tree (`DeepPartial<InstanceConfigTree>`). Client options moved under the `client` key, and axios options under `client.axiosRequestConfig`. `trackPendingChannelInvites` stays a top-level option.

```ts
// Before
chatService.init(apiKey, userId, token, {
  timeout: 10000,
  trackPendingChannelInvites: true,
});

// After
chatService.init(apiKey, userId, token, {
  client: { axiosRequestConfig: { timeout: 10000 } },
  trackPendingChannelInvites: true,
});
```

See the [StreamChatOptions keys mapping](https://github.com/GetStream/stream-chat-js/blob/release-v10/ai-docs/v10-breaking-changes.md#streamchat-options) for every option.

### User parameter

The `userOrId` parameter type changed from `string | OwnUserResponse | UserResponse` to `string | ClientUser` (`ClientUser` is exported by `stream-chat`: a partial `OwnUserResponse` with a required `id`). In practice you can pass `{ id, name, image }` objects as before. Custom user fields go under `custom`, see [Custom data moved under `custom`](#custom-data-moved-under-custom).

### State recovery after reconnect

After a reconnect, the SDK refreshes the channel list (same as before). In addition, `stream-chat` v10 now reloads the active channel and the open thread, so they catch up with the messages sent while the user was offline.

The SDK no longer sets `client.recoverStateOnReconnect = false` (the option doesn't exist in v10); connection recovery is on by default. Don't turn it off (`client.connectionRecovery.enabled: false`): then `stream-chat` doesn't dispatch the `connection.recovered` event, and the SDK doesn't refresh the channel list after a reconnect either.

## Connection state

- `stream-chat` v10 no longer emits the `connection.changed` event. `ChatClientService.connectionState$` (`'online' | 'offline'`) and the "Connection failure, reconnecting now..." notification still work: they now use the WebSocket's health state.
- `connectionState$` now switches to `'offline'` only if the connection stays unhealthy for 5 seconds. A shorter outage emits nothing.
- If you listened to `connection.changed` on `ChatClientService.events$` or `chatClient.on(...)`, use `connectionState$` instead, or `chatClient.wsConnection.state` (see [connection.changed](https://github.com/GetStream/stream-chat-js/blob/release-v10/ai-docs/v10-breaking-changes.md#connection-changed-removed)).

## Channel list

### Filters

`ChannelFilters` is now the `stream-chat` v10 type. The v10 types require custom fields to be prefixed with `custom.`, and allow only one operator per key (combine more with `$and`).

```ts
// Before
channelService.init({ type: "messaging", color: "green" });

// After
channelService.init({ type: "messaging", "custom.color": "green" });
```

### Sort

`ChannelService.init`'s `sort` parameter (and `ChannelQuery`'s constructor) now uses the SDK's own `ChannelSort` type, exported by `stream-chat-angular` (it's no longer exported by `stream-chat`). It accepts the v10 format and the previous object format, so existing code keeps working:

```ts
import { ChannelSort } from "stream-chat-angular";

const sort: ChannelSort = [{ field: "last_message_at", direction: -1 }]; // v10 format
const legacySort: ChannelSort = { last_message_at: -1 }; // still accepted
```

### Custom channel queries (`initWithCustomQuery`)

In v10, `client.queryChannels` returns the raw API response and doesn't create `Channel` instances. If your custom query function called `queryChannels`, switch to `queryChannelsAndHydrate` (filter and sort move into the request object):

```ts
// Before
channelService.initWithCustomQuery(async () => {
  const channels = await client.queryChannels(filters, { last_message_at: -1 }, { limit: 25 });
  return { channels, hasMorePage: channels.length === 25 };
});

// After
channelService.initWithCustomQuery(async () => {
  const channels = await client.queryChannelsAndHydrate({
    filter_conditions: filters,
    sort: [{ field: "last_message_at", direction: -1 }],
    limit: 25,
  });
  return { channels, hasMorePage: channels.length === 25 };
});
```

## Custom data moved under `custom`

In v10, every custom field lives under the `custom` object of the entity (channel, message, user, attachment, reaction, poll, event). Update your templates and code that read or write custom data.

### Channel name and image

`name` and `image` are custom channel fields, so they moved too:

```html
<!-- Before -->
{{ channel.data?.name }} <img [src]="channel.data?.image" />

<!-- After -->
{{ channel.data?.custom?.name }} <img [src]="channel.data?.custom?.image" />
```

The SDK's `DefaultChannelData` augmentation now types the `custom` object (`channel.data.custom.name`, `channel.data.custom.image`). If you augment `CustomChannelData` yourself, your fields are typed under `channel.data.custom` as well.

### Messages

Custom message fields are read from `message.custom` (for example `message.custom.priority`). `ChannelService.sendMessage`'s `customData` parameter is sent as `custom` (you don't need to change how you call it). `MessageInput.customData` returned by `beforeSendMessage` works the same way.

### Users and reactions

Custom user fields are under `user.custom`. `ChannelService.addReaction`'s `customData` parameter is sent as `reaction.custom`.

## `StreamMessage` and other message types

`StreamMessage` is now based on the v10 `LocalMessage` type instead of `FormatMessageResponse` (removed in v10). Date fields are still `Date` objects in `StreamMessage`: the SDK converts them from the v10 format (`TimestampNS`, unix nanoseconds).

| Change                                                                                                        | Before                                  | After                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| Base type                                                                                                     | `FormatMessageResponse`                 | `MessageWithDates<LocalMessage>` (exported by `stream-chat-angular`)                   |
| Date fields (`created_at`, `updated_at`, `deleted_at`, `pinned_at`, `pin_expires`, `message_text_updated_at`) | `Date` (or `null`)                      | `Date` or `undefined` (never `null`)                                                   |
| `quoted_message`                                                                                              | `MessageResponseBase & { translation }` | `MessageWithDates & { translation }` (dates are `Date` objects)                        |
| Custom fields                                                                                                 | top-level                               | under `custom`                                                                         |
| `moderation_details`                                                                                          | moderation result (v1)                  | removed, use `moderation` (see [Moderation](#moderation-bounced-and-blocked-messages)) |
| `__html`                                                                                                      | set on message previews                 | removed                                                                                |

New exported types: `MessageDateFields` (names of the converted date fields) and `MessageWithDates<T>`.

If you need the v10 message format (for example to call `stream-chat` APIs), the raw messages are available on the channel's paginator: `channel.messagePaginator.getItem(message.id)`. If you work with v10 objects directly, use the `nsToDate` and `dateToNs` helpers exported by `stream-chat` to convert dates.

Other message-related types that are no longer exported by `stream-chat`: `FormatMessageResponse` (use `LocalMessage`), `MessageResponseBase` (use `MessageResponse`), `DraftMessagePayload` (use `MessageRequest`), `CommandResponse` (use `Command`). See the [type rename table](https://github.com/GetStream/stream-chat-js/blob/release-v10/ai-docs/v10-breaking-changes.md#type-rename-table).

## Message list, pagination, and jumping to messages

`stream-chat` v10 removed `channel.state.messages`, `latestMessages`, `messageSets`, `threads`, `pinnedMessages` and `loadMessageIntoState`. Messages now live in `channel.messagePaginator` (thread replies in `thread.messagePaginator`, pinned messages in `channel.pinnedMessagesPaginator`). The SDK's observables (`activeChannelMessages$`, `activeThreadMessages$`, `activeChannelPinnedMessages$`) work as before, but code that read the channel state directly has to change:

| Before                                                               | After                                                                                                                            |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `channelService.activeChannel.state.messages`                        | `channelService.activeChannelMessages$` or `channel.messagePaginator.items`                                                      |
| `channel.state.latestMessages`                                       | `channel.messagePaginator.anchoredHeadItems` (latest loaded messages), `channel.messagePaginator.latestMessage` (latest message) |
| `channel.state.pinnedMessages`                                       | `channelService.activeChannelPinnedMessages$` or `channel.pinnedMessagesPaginator.items`                                         |
| `channel.state.threads[parentId]`                                    | `channelService.activeThreadMessages$` or `client.threads.get(parentId)?.messagePaginator.items`                                 |
| `channel.state.loadMessageIntoState(id)`                             | `channelService.jumpToMessage(id)`                                                                                               |
| `channel.lastMessage()`                                              | `channel.messagePaginator.latestMessage`                                                                                         |
| `channel.state.messages = []` / `addMessageSorted` / `removeMessage` | `channel.messagePaginator.removeItem({ id })` / `ingestItem(message)` (v10 `LocalMessage`)                                       |

### `loadMoreMessages` and `loadMoreThreadReplies`

- The return type changed from `false | Promise<QueryChannelAPIResponse>` (`loadMoreMessages`) / `false | Promise<void>` (`loadMoreThreadReplies`) to `false | Promise<void>`.
- They return `false` (no request) if there's nothing more to load in the given direction, a page is already loading, or no message is loaded yet. If the request fails, the returned promise rejects.
- `loadMoreThreadReplies('newer')` now loads newer replies (it previously always returned `false`). This happens after jumping to an older reply.

### `jumpToMessage`

The method signature is unchanged, but it now uses `stream-chat` v10's message paginator:

- If the message isn't found or can't be loaded, the promise rejects and the "Message not found" notification is displayed (same as before).
- Jumping to a thread reply also loads the parent message into the channel's message list if needed, then opens the thread and jumps to the reply.

### Channel preview

`ChannelPreviewComponent.latestMessage`'s type changed from `FormatMessageResponse` to `MessageWithDates<LocalMessage>`. The latest message now comes from `channel.messagePaginator`, so custom channel preview templates no longer need `message.new` / `message.updated` / `message.deleted` listeners to stay up to date.

## Threads

- In v10, channels don't store thread replies, replies are stored by `Thread` instances held by `client.threads`. The SDK creates the `Thread` (`client.threads.ensure`) when you call `setAsActiveParentMessage`.
- `channel.getReplies` was removed in v10. The SDK no longer calls it; if your code did, use `client.threads.get(parentId)?.messagePaginator` (or the raw `client.getReplies({ parent_id }, options)`).
- `setAsActiveParentMessage(message, loadMessagesFrom)`: the second parameter is ignored (deprecated). Replies are always loaded by the thread.
- The SDK calls `client.threads.registerSubscriptions()` in `ChannelService.init`, that's required for threads to receive WebSocket events. Don't call `client.threads.unregisterSubscriptions()`, it disposes the reply lists of the threads.

## Custom event handlers and setters

The custom handler hooks (`customNewMessageHandler`, `customChannelUpdatedHandler`, `customChannelTruncatedHandler`, `customChannelDeletedHandler`, `customChannelHiddenHandler`, `customChannelVisibleHandler`, `customNewMessageNotificationHandler`, `customAddedToChannelNotificationHandler`, `customRemovedFromChannelNotificationHandler`) keep their signatures, with these changes:

- The `event` parameter (and `ClientEvent.event`) is the v10 `Event` type. It's a union of the event types: fields only exist on the events that have them, so narrow by `event.type` first:

  ```ts
  if (event.type === "notification.message_new") {
    const channel = event.channel; // typed
  }
  ```

  `EventTypes` was renamed to `EventType`. Custom event fields are under `event.custom`.

- `messageListSetter` and `threadListSetter` still work, but the message lists are owned by `stream-chat`'s message paginators: the next paginator update (for example the next message) overwrites the list you set. To permanently change a message list, update the paginator instead (`channel.messagePaginator.removeItem` / `ingestItem`).
- `channel.updated`: the SDK no longer copies `event.channel` into `channel.data` (`stream-chat` v10 does it, keeping `hidden`, `own_capabilities` and `member_count`).
- `channel.truncated`: the SDK no longer clears `channel.state.messages`; `stream-chat` v10 truncates the message list.
- The SDK no longer handles `message.updated`, `message.deleted` and `reaction.*` events itself: the message lists are updated from the message paginators.

## Attachments and voice recordings

In v10, attachment metadata moved under `attachment.custom`. This includes the fields added by the SDK:

| Before                            | After                                    |
| --------------------------------- | ---------------------------------------- |
| `attachment.mime_type`            | `attachment.custom.mime_type`            |
| `attachment.file_size`            | `attachment.custom.file_size`            |
| `attachment.duration`             | `attachment.custom.duration`             |
| `attachment.waveform_data`        | `attachment.custom.waveform_data`        |
| `attachment.img_url` (deprecated) | `attachment.custom.img_url` (deprecated) |
| `attachment.isCustomAttachment`   | `attachment.custom.isCustomAttachment`   |

- Every attachment needs a `custom` object (it can be empty). Add `custom: {}` to attachments you create, for example with `attachmentService.addAttachment`:

  ```ts
  attachmentService.addAttachment({
    type: "image",
    image_url: "https://...",
    custom: {},
  });
  ```

- `AttachmentUpload.extraData` is merged into the attachment, so put custom metadata in `extraData.custom`.
- `GalleryAttachment` (gallery context of custom attachment templates) now has a required `custom` property.
- `DefaultAttachmentData` has two new fields, `duration` and `waveform_data`.
- If you have custom attachment templates, read the fields from their new location.
- Custom upload/delete handlers (`customImageUploadRequest`, `customFileUploadRequest`, `customImageDeleteRequest`, `customFileDeleteRequest`) are unchanged. The default upload requests now use `channel.uploadImage` / `uploadFile` (`channel.sendImage` / `sendFile` were removed in v10).

## Message input and drafts

- `MessageInputComponent.messageDraftChange` emits `MessageRequest | undefined` (was `DraftMessagePayload | undefined`, removed in v10). The fields are the same (`text`, `attachments`, `mentioned_users`, `poll_id`, `parent_id`, `quoted_message_id`).
- `MessageInputComponent.loadDraft` takes the v10 `DraftResponse`: `draft.message.mentioned_users` is now a list of users (it was a list of ids), and dates are `TimestampNS`. To save a draft with `stream-chat` v10: `channel.createDraft({ message: draft })`.
- Slash commands come from `channel.config.availableCommands` (was `channel.getConfig().commands`). `ComandAutocompleteListItem` is now based on `Command` (was `CommandResponse`).

## Polls

- Poll types renamed in v10, and the SDK's poll components use the new names (relevant for custom poll templates and if you use the poll components directly):

  | Before                   | After                    |
  | ------------------------ | ------------------------ |
  | `PollOption`             | `PollOptionResponseData` |
  | `PollVote`, `PollAnswer` | `PollVoteResponseData`   |

  Affected inputs: `PollVoteComponent.vote`, `UpsertAnswerComponent.answer`, `PollVoteResultsListComponent.option`.

- `VotingVisibility` is now a string union type (`'anonymous' | 'public'`), not an enum.
- Poll, option, vote and answer dates are `TimestampNS` (unix nanoseconds), convert them with `nsToDate`.
- Sort options of poll queries use `[{ field, direction }]` (for example `[{ field: 'created_at', direction: -1 }]`).

## Reactions

- `MessageReactionsComponent.messageReactionGroups` uses the v10 `ReactionGroupResponse`: `first_reaction_at` / `last_reaction_at` are `TimestampNS`.
- Custom reaction fields are under `reaction.custom`.
- `ChannelService.getMessageReactions` (deprecated) and `MessageReactionsService.queryReactions` work as before, they use the v10 requests internally.

## Moderation (bounced and blocked messages)

v10 messages no longer have `moderation_details`. Bounced messages are detected with `message.type === 'error' && message.moderation?.action === 'bounce'`, and blocked messages with `message.moderation?.action === 'remove'`. If you have a custom message template or `MessageBouncePrompt` customization that checked `moderation_details`, switch to `moderation`.

## Other type changes

| Type / API                                       | Before                                                          | After                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ChatClientService.appSettings$` / `AppSettings` | `AppSettings` from `stream-chat`                                | `AppSettings` from `stream-chat-angular` (`Partial<AppResponseFields>`)               |
| `ChannelService.activeChannelMessages` getter    | `(StreamMessage \| MessageResponse \| FormatMessageResponse)[]` | `(StreamMessage \| MessageResponse \| LocalMessage)[]`                                |
| `ChannelService.selectMessageToQuote`            | `StreamMessage \| MessageResponse \| undefined`                 | also accepts `LocalMessage`                                                           |
| `MessageTextContext.message`                     | `StreamMessage \| MessageResponseBase \| undefined`             | `StreamMessage \| MessageResponse \| MessageWithDates & { translation } \| undefined` |
| `ChannelSort`                                    | from `stream-chat`                                              | from `stream-chat-angular`                                                            |
| `getChannelDisplayText(channel, user)`           | `user: UserResponse`                                            | `user?: { id?: string }`                                                              |
| `listUsers(users)`                               | `users: UserResponse[]`                                         | `users: { id: string; name?: string }[]`                                              |

## Translations

New translation key: `streamChat.Error loading messages` (displayed if the messages of a channel or thread can't be loaded). If you provide your own translations, add this key.

## Behavior changes

These changes don't require code changes, but your app may behave differently:

- **Reconnect:** after a reconnect, the SDK refreshes the channel list (same as before), and `stream-chat` reloads the active channel and the open thread. The open thread now stays open (previously it was closed because its replies weren't reloaded).
- **Message list updates:** messages arriving via WebSocket can be displayed up to 500 ms later: `stream-chat` v10 batches message list updates. Messages sent by the current user are displayed immediately.
- **Message objects:** when a message changes (for example a reaction is added), only that message gets a new object in `activeChannelMessages$`. Attachments are kept if only their (signed) URLs changed, so images and videos aren't reloaded.
- **Hard deleted user messages:** in v10, `user.messages.deleted` events with `hard_delete` remove the messages instead of displaying a "This message was deleted" placeholder.
- **Read events:** the active channel is marked as read with `channel.markReadViaReporter()` (v9's `markRead` behavior). If read events are disabled for the channel, the SDK doesn't send read requests, and mark as unread fails with an error notification.
- **Typing events** are only sent if typing events are enabled for the channel (`channel.config.typingEvents.enabled`).

## New APIs

- `ChannelService.activeChannelMessagesPaginationState$` and `activeThreadMessagesPaginationState$`: pagination state of the message lists (`MessageListPaginationState`: `hasMoreOlder`, `hasMoreNewer`, `isLoading`, `error`).
- `ChannelService.jumpToFirstUnreadMessage()`: jumps to the first unread message of the active channel (uses `stream-chat`'s unread state).
- `ChannelService.reloadActiveChannelMessages()`: retries loading the messages of the active channel (for example after an error).
- `ChannelSort`, `MessageListPaginationState`, `MessageDateFields`, `MessageWithDates`, `AppSettings` types.

## Direct usage of the stream-chat client

If you use `chatService.chatClient` or `Channel` objects directly, these are the v10 changes you're most likely to hit (see the [stream-chat v10 breaking changes](https://github.com/GetStream/stream-chat-js/blob/release-v10/ai-docs/v10-breaking-changes.md) for the full list):

| Before (v9)                                                       | After (v10)                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `client.activeChannels[cid]`                                      | `client.channelManager.get(cid)`                                                                  |
| `client.queryChannels(filters, sort, options)`                    | `client.queryChannelsAndHydrate({ filter_conditions, sort: [{ field, direction }], ...options })` |
| `client.queryUsers(filters, sort, options)`                       | `client.queryUsers({ payload: { filter_conditions, sort, ...options } })`                         |
| `client.flagMessage(id)`                                          | `client.moderation.flagMessage({ message_id: id })`                                               |
| `client.updateMessage(message)`                                   | `client.updateMessage({ id }, { message })`                                                       |
| `client.deleteMessage(id, hard)`                                  | `client.deleteMessage({ id }, { hard })`                                                          |
| `client.pinMessage(message)` / `unpinMessage(message)`            | `client.pinMessage({ id })` / `unpinMessage({ id })`                                              |
| `client.queryReactions(id, filter, sort, options)`                | `client.queryReactions({ id }, { filter, sort, ...options })`                                     |
| `client.on('connection.changed', ...)`                            | `client.wsConnection.state.subscribeWithSelector(({ isHealthy }) => ({ isHealthy }), ...)`        |
| `client.logger(...)`                                              | `chatLoggerSystem`                                                                                |
| `channel.sendMessage(message)`                                    | `channel.sendMessage({ message })`                                                                |
| `channel.sendReaction(id, reaction)` / `deleteReaction(id, type)` | `channel.sendReaction({ id }, { reaction })` / `deleteReaction({ id, type })`                     |
| `channel.markRead()`                                              | `channel.markReadViaReporter()` (`markRead()` is now the raw request)                             |
| `channel.getConfig()`                                             | `channel.serverConfig` (server config), `channel.config` (resolved config)                        |
| `channel.sendImage` / `sendFile`                                  | `channel.uploadImage({ file })` / `uploadFile({ file })`                                          |
| `channel.queryMembers(filters, sort, options)`                    | `channel.queryMembers({ payload: { filter_conditions, sort, ...options } })`                      |
| `channel.getReplies(parentId, options)`                           | `client.threads` / `thread.messagePaginator`, or `client.getReplies({ parent_id }, options)`      |
| `channel.state.*` message storage                                 | `channel.messagePaginator` (see [Message list](#message-list-pagination-and-jumping-to-messages)) |
| Date fields as `string` / `Date`                                  | `TimestampNS` (unix nanoseconds), convert with `nsToDate` / `dateToNs`                            |
| Custom fields at the top level                                    | under `custom`                                                                                    |
| Sort as `{ field: direction }`                                    | `[{ field, direction }]`                                                                          |

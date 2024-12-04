import {
  Channel,
  ChannelFilters,
  ChannelOptions,
  ChannelSort,
} from 'stream-chat';
import { ChannelService } from './channel.service';
import {
  ChannelQueryResult,
  ChannelQueryType,
  DefaultStreamChatGenerics,
  NextPageConfiguration,
} from './types';
import { ChatClientService } from './chat-client.service';

/**
 * This class allows you to make paginated channel query requests.
 */
export class ChannelQuery<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> {
  /**
   * By default the SDK uses an offset based pagination, you can change/extend this by providing your own custom paginator method.
   *
   * The method will be called with the result of the latest channel query.
   *
   * You can return either an offset, or a filter using the [`$lte`/`$gte` operator](/chat/docs/javascript/query_syntax_operators/). If you return a filter, it will be merged with the filter provided for the `init` method.
   */
  customPaginator?: (channelQueryResult: Channel<T>[]) => NextPageConfiguration;
  private nextPageConfiguration?: NextPageConfiguration;

  constructor(
    private chatService: ChatClientService<T>,
    private channelService: ChannelService<T>,
    private filters: ChannelFilters<T>,
    private sort: ChannelSort<T> = { last_message_at: -1 },
    private options: ChannelOptions = {
      limit: 25,
      state: true,
      presence: true,
      watch: true,
    }
  ) {}

  async query(queryType: ChannelQueryType): Promise<ChannelQueryResult<T>> {
    if (queryType === 'first-page' || queryType === 'recover-state') {
      this.nextPageConfiguration = undefined;
    }
    const prevChannels =
      queryType === 'recover-state' ? [] : this.channelService.channels;
    let filters: ChannelFilters<T>;
    let options: ChannelOptions;
    if (this.nextPageConfiguration) {
      if (this.nextPageConfiguration.type === 'filter') {
        filters = {
          ...this.filters,
          ...this.nextPageConfiguration.paginationFilter,
        };
        options = this.options;
      } else {
        options = {
          ...this.options,
          offset: this.nextPageConfiguration.offset,
        };
        filters = this.filters;
      }
    } else {
      filters = this.filters;
      options = this.options;
    }
    const channels = await this.chatService.chatClient.queryChannels(
      filters,
      this.sort || {},
      options
    );
    this.setNextPageConfiguration(channels);

    const currentActiveChannel = this.channelService.activeChannel;
    if (
      queryType === 'recover-state' &&
      currentActiveChannel &&
      !channels.find((c) => c.cid === currentActiveChannel?.cid)
    ) {
      try {
        await currentActiveChannel.watch();
        channels.unshift(currentActiveChannel);
      } catch (error) {
        this.chatService.chatClient.logger(
          'warn',
          'Unable to refetch active channel after state recover',
          error as Record<string, unknown>
        );
      }
    }

    return {
      channels: [...prevChannels, ...channels],
      hasMorePage: channels.length >= this.options.limit!,
    };
  }

  setNextPageConfiguration(channelQueryResult: Channel<T>[]) {
    if (this.customPaginator) {
      this.nextPageConfiguration = this.customPaginator(channelQueryResult);
    } else {
      this.nextPageConfiguration = {
        type: 'offset',
        offset:
          (this.nextPageConfiguration?.type === 'offset'
            ? this.nextPageConfiguration.offset
            : 0) + channelQueryResult.length,
      };
    }
  }
}

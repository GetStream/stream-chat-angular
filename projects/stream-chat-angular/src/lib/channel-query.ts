import {
  Channel,
  ChannelFilters,
  ChannelOptions,
  SortParamRequest,
} from 'stream-chat';
import { ChannelService } from './channel.service';
import {
  ChannelQueryResult,
  ChannelQueryType,
  NextPageConfiguration,
} from './types';
import { ChatClientService } from './chat-client.service';

/**
 * This class allows you to make paginated channel query requests.
 */
export class ChannelQuery {
  /**
   * By default the SDK uses an offset based pagination, you can change/extend this by providing your own custom paginator method.
   *
   * The method will be called with the result of the latest channel query.
   *
   * You can return either an offset, or a filter using the [`$lte`/`$gte` operator](/docs/platform/query-syntax-operators/). If you return a filter, it will be merged with the filter provided for the `init` method.
   */
  customPaginator?: (channelQueryResult: Channel[]) => NextPageConfiguration;
  private nextPageConfiguration?: NextPageConfiguration;

  constructor(
    private chatService: ChatClientService,
    private channelService: ChannelService,
    private filters: ChannelFilters,
    private sort: SortParamRequest[] = [
      { field: 'last_message_at', direction: -1 },
    ],
    private options: ChannelOptions = {
      limit: 25,
      state: true,
      presence: true,
      watch: true,
    }
  ) {}

  async query(queryType: ChannelQueryType): Promise<ChannelQueryResult> {
    if (queryType === 'first-page' || queryType === 'recover-state') {
      this.nextPageConfiguration = undefined;
    }
    const prevChannels =
      queryType === 'recover-state' ? [] : this.channelService.channels;
    let filters: ChannelFilters;
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
    const channels = await this.chatService.chatClient.queryChannelsAndHydrate({
      ...options,
      filter_conditions: filters,
      sort: this.sort,
    });
    this.setNextPageConfiguration(channels);

    const currentActiveChannel = this.channelService.activeChannel;
    if (
      queryType === 'recover-state' &&
      currentActiveChannel &&
      !channels.find((c) => c.cid === currentActiveChannel?.cid)
    ) {
      // The active channel is activated, so stream-chat reloads it after reconnect, we just keep it in the list
      channels.unshift(currentActiveChannel);
    }

    return {
      channels: [...prevChannels, ...channels],
      hasMorePage: channels.length >= this.options.limit!,
    };
  }

  setNextPageConfiguration(channelQueryResult: Channel[]) {
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

import { VirtualizedMessageListService } from './virtualized-message-list.service';
import {
  generateMockMessages,
  mockChannelService,
  MockChannelService,
} from './mocks';
import { BehaviorSubject } from 'rxjs';
import { VirtualizedListScrollPosition } from './types';
import { ChannelService } from './channel.service';

describe('VirtualizedMessageListService', () => {
  let service: VirtualizedMessageListService;
  let channelService: MockChannelService;
  let scrollPosition$: BehaviorSubject<VirtualizedListScrollPosition>;

  describe('main mode', () => {
    beforeEach(() => {
      scrollPosition$ = new BehaviorSubject<VirtualizedListScrollPosition>(
        'middle'
      );
      channelService = mockChannelService();
      service = new VirtualizedMessageListService(
        'main',
        scrollPosition$,
        channelService as unknown as ChannelService
      );
    });

    it('should provide query implementation', () => {
      spyOn(channelService, 'loadMoreMessages').and.callThrough();

      void service['query']('top');

      expect(channelService['loadMoreMessages']).toHaveBeenCalledWith('older');

      void service['query']('bottom');

      expect(channelService['loadMoreMessages']).toHaveBeenCalledWith('newer');
    });

    it('should handle if there are no more items to load', () => {
      service['bufferOnBottom'] = 7;
      service['bufferOnTop'] = 10;
      const queryStateSpy = jasmine.createSpy();
      service.queryState$.subscribe(queryStateSpy);
      const loadFromBufferSpy = jasmine.createSpy();
      service['loadFromBuffer$'].subscribe(loadFromBufferSpy);
      queryStateSpy.calls.reset();
      loadFromBufferSpy.calls.reset();

      spyOn(channelService, 'loadMoreMessages').and.returnValue();

      void service['query']('top');

      expect(queryStateSpy).toHaveBeenCalledWith({ state: 'success' });
      expect(loadFromBufferSpy).toHaveBeenCalled();

      queryStateSpy.calls.reset();
      loadFromBufferSpy.calls.reset();
      void service['query']('bottom');

      expect(queryStateSpy).toHaveBeenCalledWith({ state: 'success' });
      expect(loadFromBufferSpy).toHaveBeenCalled();

      queryStateSpy.calls.reset();
      loadFromBufferSpy.calls.reset();
      service['bufferOnBottom'] = 0;
      void service['query']('bottom');

      expect(queryStateSpy).toHaveBeenCalledWith({ state: 'success' });
      expect(loadFromBufferSpy).not.toHaveBeenCalled();
    });

    it('should provide jump to message Observable', () => {
      const spy = jasmine.createSpy();
      service.jumpToItem$?.subscribe(spy);
      spy.calls.reset();

      channelService.jumpToMessage$.next({ id: 'latest' });
      const latestMessageId =
        channelService.activeChannelMessages[
          channelService.activeChannelMessages.length - 1
        ].id;

      expect(spy).toHaveBeenCalledWith({
        item: { id: latestMessageId },
        position: 'bottom',
      });

      channelService.jumpToMessage$.next({ id: '123' });

      expect(spy).toHaveBeenCalledWith({
        item: { id: '123' },
        position: 'middle',
      });

      channelService.jumpToMessage$.next({ id: undefined });

      expect(spy).toHaveBeenCalledWith({
        item: undefined,
      });
    });

    it('should provide is equal implementation', () => {
      const [firstMessage, secondMessage] = generateMockMessages();

      expect(service['isEqual'](firstMessage, secondMessage)).toBeFalse();

      expect(service['isEqual'](firstMessage, firstMessage)).toBeTrue();
    });
  });

  describe('thread mode', () => {
    beforeEach(() => {
      scrollPosition$ = new BehaviorSubject<VirtualizedListScrollPosition>(
        'middle'
      );
      channelService = mockChannelService();
      service = new VirtualizedMessageListService(
        'thread',
        scrollPosition$,
        channelService as unknown as ChannelService
      );
    });

    it('should provide query implementation', () => {
      spyOn(channelService, 'loadMoreThreadReplies').and.callThrough();

      void service['query']('top');

      expect(channelService['loadMoreThreadReplies']).toHaveBeenCalledWith(
        'older'
      );

      void service['query']('bottom');

      expect(channelService['loadMoreThreadReplies']).toHaveBeenCalledWith(
        'newer'
      );
    });

    it('should handle if there are no more items to load', () => {
      service['bufferOnBottom'] = 7;
      service['bufferOnTop'] = 10;
      const queryStateSpy = jasmine.createSpy();
      service.queryState$.subscribe(queryStateSpy);
      const loadFromBufferSpy = jasmine.createSpy();
      service['loadFromBuffer$'].subscribe(loadFromBufferSpy);
      queryStateSpy.calls.reset();
      loadFromBufferSpy.calls.reset();

      spyOn(channelService, 'loadMoreThreadReplies').and.returnValue();

      void service['query']('top');

      expect(queryStateSpy).toHaveBeenCalledWith({ state: 'success' });
      expect(loadFromBufferSpy).toHaveBeenCalled();

      queryStateSpy.calls.reset();
      loadFromBufferSpy.calls.reset();
      void service['query']('bottom');

      expect(queryStateSpy).toHaveBeenCalledWith({ state: 'success' });
      expect(loadFromBufferSpy).toHaveBeenCalled();

      queryStateSpy.calls.reset();
      loadFromBufferSpy.calls.reset();
      service['bufferOnBottom'] = 0;
      void service['query']('bottom');

      expect(queryStateSpy).toHaveBeenCalledWith({ state: 'success' });
      expect(loadFromBufferSpy).not.toHaveBeenCalled();
    });

    it('should provide jump to message Observable', () => {
      const spy = jasmine.createSpy();
      service.jumpToItem$?.subscribe(spy);
      spy.calls.reset();

      const mockMessages = generateMockMessages();
      channelService.activeChannelThreadReplies = mockMessages;
      const latestMessageId = mockMessages[mockMessages.length - 1]?.id;
      channelService.jumpToMessage$.next({ parentId: 'parent', id: 'latest' });

      expect(spy).toHaveBeenCalledWith({
        item: { id: latestMessageId },
        position: 'bottom',
      });

      channelService.jumpToMessage$.next({ id: '123', parentId: 'parent' });

      expect(spy).toHaveBeenCalledWith({
        item: { id: '123' },
        position: 'middle',
      });

      channelService.jumpToMessage$.next({
        id: undefined,
        parentId: undefined,
      });

      expect(spy).toHaveBeenCalledWith({
        item: undefined,
      });

      channelService.jumpToMessage$.next({
        id: 'id',
        parentId: undefined,
      });

      expect(spy).toHaveBeenCalledWith({
        item: undefined,
      });
    });

    it('should provide is equal implementation', () => {
      const [firstMessage, secondMessage] = generateMockMessages();

      expect(service['isEqual'](firstMessage, secondMessage)).toBeFalse();

      expect(service['isEqual'](firstMessage, firstMessage)).toBeTrue();
    });
  });
});

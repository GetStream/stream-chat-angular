import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { ChannelPreviewComponent } from '../channel-preview/channel-preview.component';
import { ChannelService } from '../channel.service';
import { ChatClientService, ClientEvent } from '../chat-client.service';
import {
  generateMockChannels,
  mockChannelService,
  MockChannelService,
} from '../mocks';
import { ThemeService } from '../theme.service';
import { ChannelListComponent } from './channel-list.component';
import { Subject, of } from 'rxjs';
import { PaginatedListComponent } from '../paginated-list/paginated-list.component';
import { Channel } from 'stream-chat';

describe('ChannelListComponent', () => {
  let channelServiceMock: MockChannelService;
  let fixture: ComponentFixture<ChannelListComponent>;
  let nativeElement: HTMLElement;
  let queryContainer: () => HTMLElement | null;
  let queryChannels: () => ChannelPreviewComponent[];
  let queryChatdownContainer: () => HTMLElement | null;
  let queryLoadingIndicator: () => HTMLElement | null;
  let queryEmptyIndicator: () => HTMLElement | null;

  beforeEach(() => {
    channelServiceMock = mockChannelService();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [
        ChannelListComponent,
        ChannelPreviewComponent,
        PaginatedListComponent,
      ],
      providers: [
        { provide: ChannelService, useValue: channelServiceMock },
        {
          provide: ChatClientService,
          useValue: {
            user$: of({ id: 'userid' }),
            chatClient: { user: { id: 'userid' } },
            events$: new Subject<ClientEvent>(),
          },
        },
        ThemeService,
      ],
    });
    fixture = TestBed.createComponent(ChannelListComponent);
    nativeElement = fixture.nativeElement as HTMLElement;
    queryChannels = () =>
      fixture.debugElement
        .queryAll(By.directive(ChannelPreviewComponent))
        .map((e) => e.componentInstance as ChannelPreviewComponent);
    queryChatdownContainer = () =>
      nativeElement.querySelector('[data-testid="chatdown-container"]');
    queryLoadingIndicator = () =>
      nativeElement.querySelector(
        '[data-testid="loading-indicator-full-size"]'
      );
    queryEmptyIndicator = () =>
      nativeElement.querySelector(
        '[data-testid="empty-channel-list-indicator"]'
      );
    queryContainer = () =>
      nativeElement.querySelector('[data-testid="channel-list-container"]');
  });

  it('should display channels', () => {
    expect(queryChannels().length).toBe(0);

    const channels = generateMockChannels();
    channelServiceMock.channels$.next(channels);
    fixture.detectChanges();
    const channelsComponents = queryChannels();

    expect(channelsComponents.length).toBe(channels.length);
    channels.forEach((c, index) =>
      expect(channelsComponents[index].channel).toBe(c)
    );
  });

  it('should display error indicator, if error happened', () => {
    expect(queryChatdownContainer()).toBeNull();

    channelServiceMock.channelQueryState$.next({
      state: 'error',
      error: new Error('error'),
    });
    fixture.detectChanges();

    expect(queryChatdownContainer()).not.toBeNull();
  });

  it('should display loading indicator, if loading', () => {
    channelServiceMock.channelQueryState$.next({
      state: 'in-progress',
    });
    fixture.detectChanges();

    expect(queryChatdownContainer()).toBeNull();
    expect(queryLoadingIndicator()).not.toBeNull();

    const channels = generateMockChannels();
    channelServiceMock.channels$.next(channels);
    channelServiceMock.channelQueryState$.next({
      state: 'success',
    });
    fixture.detectChanges();

    expect(queryLoadingIndicator()).toBeNull();
  });

  it('should display empty indicator', () => {
    let channels = generateMockChannels();
    channelServiceMock.channels$.next(channels);
    fixture.detectChanges();

    expect(queryEmptyIndicator()).toBeNull();

    channels = [];
    channelServiceMock.channels$.next(channels);
    fixture.detectChanges();

    expect(queryEmptyIndicator()).not.toBeNull();
  });

  it('should bind #hasMore', () => {
    const channels = generateMockChannels();
    channelServiceMock.channels$.next(channels);
    fixture.detectChanges();
    const paginatedListComponent = fixture.debugElement.query(
      By.directive(PaginatedListComponent)
    ).componentInstance as PaginatedListComponent<Channel>;
    channelServiceMock.hasMoreChannels$.next(false);
    fixture.detectChanges();

    expect(paginatedListComponent.hasMore).toBeFalse();

    channelServiceMock.hasMoreChannels$.next(true);
    fixture.detectChanges();

    expect(paginatedListComponent.hasMore).toBeTrue();
  });

  it(`should load more channels, but shouldn't display full-size loading indicator`, () => {
    const channels = generateMockChannels();
    channelServiceMock.channels$.next(channels);
    channelServiceMock.hasMoreChannels$.next(true);
    spyOn(channelServiceMock, 'loadMoreChannels');
    fixture.detectChanges();
    const paginatedListComponent = fixture.debugElement.query(
      By.directive(PaginatedListComponent)
    ).componentInstance as PaginatedListComponent<Channel>;
    paginatedListComponent.loadMore.emit();
    fixture.detectChanges();

    expect(channelServiceMock.loadMoreChannels).toHaveBeenCalledWith();
    expect(queryLoadingIndicator()).toBeNull();
  });

  it('should apply dark/light theme', () => {
    const service = TestBed.inject(ThemeService);
    const lightClass = 'str-chat__theme-light';
    const darkClass = 'str-chat__theme-dark';
    const container = queryContainer();
    fixture.detectChanges();

    expect(container?.classList.contains(lightClass)).toBeTrue();
    expect(container?.classList.contains(darkClass)).toBeFalse();

    service.theme$.next('dark');
    fixture.detectChanges();

    expect(container?.classList.contains(darkClass)).toBeTrue();
  });
});

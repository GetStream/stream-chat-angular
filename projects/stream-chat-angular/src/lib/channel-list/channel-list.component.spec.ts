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
import { ChannelListToggleService } from './channel-list-toggle.service';
import { ChannelListComponent } from './channel-list.component';
import { Subject, of } from 'rxjs';

describe('ChannelListComponent', () => {
  let channelServiceMock: MockChannelService;
  let fixture: ComponentFixture<ChannelListComponent>;
  let nativeElement: HTMLElement;
  let queryContainer: () => HTMLElement | null;
  let queryChannels: () => ChannelPreviewComponent[];
  let queryChannelElements: () => HTMLElement[];
  let queryChatdownContainer: () => HTMLElement | null;
  let queryLoadingIndicator: () => HTMLElement | null;
  let queryLoadMoreButton: () => HTMLElement | null;
  let queryEmptyIndicator: () => HTMLElement | null;

  beforeEach(() => {
    channelServiceMock = mockChannelService();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [ChannelListComponent, ChannelPreviewComponent],
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
    queryChannelElements = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="channel-preview"]')
      );
    queryChatdownContainer = () =>
      nativeElement.querySelector('[data-testid="chatdown-container"]');
    queryLoadingIndicator = () =>
      nativeElement.querySelector('[data-testid="loading-indicator"]');
    queryLoadMoreButton = () =>
      nativeElement.querySelector('[data-testid="load-more"]');
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
    /* eslint-disable jasmine/new-line-before-expect */
    channels.forEach((c, index) =>
      expect(channelsComponents[index].channel).toBe(c)
    );
    /* eslint-enable jasmine/new-line-before-expect */
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

  it('should display load more button', () => {
    const channels = generateMockChannels();
    channelServiceMock.channels$.next(channels);
    channelServiceMock.hasMoreChannels$.next(false);
    fixture.detectChanges();

    expect(queryLoadMoreButton()).toBeNull();

    channelServiceMock.hasMoreChannels$.next(true);
    fixture.detectChanges();

    expect(queryLoadMoreButton()).not.toBeNull();
  });

  it(`should load more channels, but shouldn't loading indicator`, () => {
    const channels = generateMockChannels();
    channelServiceMock.channels$.next(channels);
    channelServiceMock.hasMoreChannels$.next(true);
    spyOn(channelServiceMock, 'loadMoreChannels');
    fixture.detectChanges();
    queryLoadMoreButton()?.click();

    expect(queryLoadingIndicator()).toBeNull();
    expect(channelServiceMock.loadMoreChannels).toHaveBeenCalledWith();
  });

  it('should apply open class', () => {
    const service = TestBed.inject(ChannelListToggleService);
    const openClass = 'str-chat-channel-list--open';
    service.close();
    const container = queryContainer();
    fixture.detectChanges();

    expect(container?.classList.contains(openClass)).toBeFalse();

    service.open();
    fixture.detectChanges();

    expect(container?.classList.contains(openClass)).toBeTrue();
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

  it('should notify the channelListToggleService if a channel is selected', () => {
    const service = TestBed.inject(ChannelListToggleService);
    spyOn(service, 'channelSelected');
    spyOn(service, 'setMenuElement');
    fixture.detectChanges();

    expect(service.setMenuElement).toHaveBeenCalledWith(queryContainer()!);

    const channels = generateMockChannels();
    channelServiceMock.channels$.next(channels);
    fixture.detectChanges();
    queryChannelElements()[0].click();
    fixture.detectChanges();

    expect(service.channelSelected).toHaveBeenCalledWith();
  });
});

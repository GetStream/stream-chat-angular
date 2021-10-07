import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { ChannelPreviewComponent } from '../channel-preview/channel-preview.component';
import { ChannelService } from '../channel.service';
import {
  generateMockChannels,
  mockChannelService,
  MockChannelService,
} from '../mocks';
import { ChannelListComponent } from './channel-list.component';

describe('ChannelListComponent', () => {
  let channelServiceMock: MockChannelService;
  let fixture: ComponentFixture<ChannelListComponent>;
  let nativeElement: HTMLElement;
  let queryChannels: () => ChannelPreviewComponent[];
  let queryChatdownContainer: () => HTMLElement | null;
  let queryLoadingIndicator: () => HTMLElement | null;
  let queryLoadMoreButton: () => HTMLElement | null;
  let queryEmptyIndicator: () => HTMLElement | null;

  beforeEach(() => {
    channelServiceMock = mockChannelService();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [ChannelListComponent, ChannelPreviewComponent],
      providers: [{ provide: ChannelService, useValue: channelServiceMock }],
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
      nativeElement.querySelector('[data-testid="loading-indicator"]');
    queryLoadMoreButton = () =>
      nativeElement.querySelector('[data-testid="load-more"]');
    queryEmptyIndicator = () =>
      nativeElement.querySelector(
        '[data-testid="empty-channel-list-indicator"]'
      );
    fixture.detectChanges();
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

    channelServiceMock.channels$.error(new Error('error'));
    fixture.detectChanges();

    expect(queryChatdownContainer()).not.toBeNull();
  });

  it('should display loading indicator, if loading', () => {
    expect(queryChatdownContainer()).toBeNull();
    expect(queryLoadingIndicator()).not.toBeNull();

    const channels = generateMockChannels();
    channelServiceMock.channels$.next(channels);
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
});

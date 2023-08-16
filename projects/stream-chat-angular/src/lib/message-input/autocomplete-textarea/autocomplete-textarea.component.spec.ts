import { SimpleChange } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MentionModule } from 'angular-mentions';
import { Channel } from 'stream-chat';
import { ChatClientService } from '../../chat-client.service';
import { ChannelService } from '../../channel.service';
import { mockChannelService, MockChannelService } from '../../mocks';
import { AutocompleteTextareaComponent } from './autocomplete-textarea.component';
import { Subject } from 'rxjs';
import { EmojiInputService } from '../emoji-input.service';
import { DefaultStreamChatGenerics } from '../../types';
import { ThemeService } from '../../theme.service';

describe('AutocompleteTextareaComponent', () => {
  let component: AutocompleteTextareaComponent;
  let fixture: ComponentFixture<AutocompleteTextareaComponent>;
  let nativeElement: HTMLElement;
  let queryTextarea: () => HTMLTextAreaElement | null;
  let channelServiceMock: MockChannelService;
  let queryAvatars: () => HTMLElement[];
  let queryUsernames: () => HTMLElement[];
  let queryCommands: () => HTMLElement[];
  let chatClientServiceMock: { autocompleteUsers: jasmine.Spy };
  let emojiInput$: Subject<string>;

  beforeEach(async () => {
    channelServiceMock = mockChannelService();
    chatClientServiceMock = {
      autocompleteUsers: jasmine.createSpy().and.returnValue([]),
    };
    emojiInput$ = new Subject();
    await TestBed.configureTestingModule({
      declarations: [AutocompleteTextareaComponent],
      imports: [TranslateModule.forRoot(), MentionModule],
      providers: [
        {
          provide: ChannelService,
          useValue: channelServiceMock,
        },
        {
          provide: ChatClientService,
          useValue: chatClientServiceMock,
        },
        {
          provide: EmojiInputService,
          useValue: { emojiInput$ },
        },
        {
          provide: ThemeService,
          useValue: { themeVersion: '2' },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AutocompleteTextareaComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    component.inputMode = 'desktop';
    queryTextarea = () =>
      nativeElement.querySelector('[data-testid="textarea"]');
    fixture.detectChanges();
    await fixture.whenStable();
    queryAvatars = () =>
      Array.from(nativeElement.querySelectorAll('[data-testclass="avatar"]'));
    queryUsernames = () =>
      Array.from(nativeElement.querySelectorAll('[data-testclass="username"]'));
    queryCommands = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="command-name"]')
      );
  });

  it('should display textarea, and focus it', () => {
    const textarea = queryTextarea();

    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe('');
    expect(textarea?.hasAttribute('autofocus')).toBeTrue();
  });

  it('should display #value in textarea', () => {
    component.value = 'This is my message';
    fixture.detectChanges();

    expect(queryTextarea()?.value).toBe('This is my message');
  });

  it('should emit #valueChange if user types in textarea', () => {
    const spy = jasmine.createSpy();
    component.valueChange.subscribe(spy);
    const textarea = queryTextarea();
    textarea!.value = 'message';
    const event = new InputEvent('input');
    textarea?.dispatchEvent(event);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('message');
  });

  it(`shouldn't emit #valueChange if enter is hit and #inputMode is desktop`, () => {
    const spy = jasmine.createSpy();
    component.valueChange.subscribe(spy);
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea!.value = message;
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(event, 'preventDefault');
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should emit #send if enter is hit and #inputMode is desktop', () => {
    const spy = jasmine.createSpy();
    component.send.subscribe(spy);
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea!.value = message;
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(event, 'preventDefault');
    textarea?.dispatchEvent(event);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(undefined);
    expect(event.preventDefault).toHaveBeenCalledWith();
  });

  it(`shouldn't emit #send if enter is hit and #inputMode is mobile`, () => {
    component.inputMode = 'mobile';
    const spy = jasmine.createSpy();
    component.send.subscribe(spy);
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea!.value = message;
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(event, 'preventDefault');
    textarea?.dispatchEvent(event);
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it(`shouldn't emit #send if shift+enter is hit`, () => {
    const spy = jasmine.createSpy();
    component.send.subscribe(spy);
    const textarea = queryTextarea();
    textarea!.value = 'This is my message';
    textarea?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true })
    );
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should increase and decrease textarea height with text input', () => {
    const textarea = queryTextarea();
    textarea!.value = 'This is my message';
    fixture.detectChanges();
    const initialHeight = textarea!.offsetHeight;
    textarea!.value = 'This is my message \n';
    textarea?.dispatchEvent(
      new KeyboardEvent('input', { key: 'Enter', shiftKey: true })
    );
    fixture.detectChanges();
    const newHeight = textarea!.offsetHeight;

    expect(newHeight).toBeGreaterThan(initialHeight);

    component.value = '';
    component.ngOnChanges({ value: {} as SimpleChange });
    fixture.detectChanges();

    expect(textarea!.offsetHeight).toBeLessThan(newHeight);
  });

  it('should add channel members to autocomplete config', () => {
    expect(component.autocompleteConfig.mentions![0].items).toEqual([
      {
        user: { id: 'jack', name: 'Jack' },
        autocompleteLabel: 'Jack',
        type: 'mention',
      },
      {
        user: { id: 'sara', name: 'Sara' },
        autocompleteLabel: 'Sara',
        type: 'mention',
      },
      { user: { id: 'eddie' }, autocompleteLabel: 'eddie', type: 'mention' },
    ]);
  });

  it('should handle channel change', async () => {
    const userMentionSpy = jasmine.createSpy();
    component.userMentions.subscribe(userMentionSpy);
    spyOn(channelServiceMock, 'autocompleteMembers').and.returnValue([
      { user: { id: 'sophie' } },
    ]);
    channelServiceMock.activeChannel$.next({
      getConfig: () => ({
        commands: [],
      }),
    } as any as Channel<DefaultStreamChatGenerics>);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.autocompleteConfig.mentions![0].items?.length).toBe(1);
    expect(userMentionSpy).toHaveBeenCalledWith([]);
  });

  it('should emit mentioned users', () => {
    const userMentionSpy = jasmine.createSpy();
    component.userMentions.subscribe(userMentionSpy);
    component.autocompleteConfig.mentions![0].mentionSelect!(
      {
        user: { id: 'jack', name: 'Jack' },
      },
      '@'
    );

    expect(userMentionSpy).toHaveBeenCalledWith([{ id: 'jack', name: 'Jack' }]);

    const textarea = queryTextarea()!;
    const message = 'No mentions';
    textarea.value = message;
    const event = new InputEvent('blur');
    textarea.dispatchEvent(event);
    fixture.detectChanges();

    expect(userMentionSpy).toHaveBeenCalledWith([]);
  });

  it('should update textarea after mention', () => {
    expect(
      component.autocompleteConfig.mentions![0].mentionSelect!(
        {
          user: { id: 'jack', name: 'Jack' },
          autocompleteLabel: 'Jack',
        },
        '@'
      )
    ).toBe('@Jack');
  });

  it('should update mentioned users if sent is triggered', () => {
    const userMentionSpy = jasmine.createSpy();
    component.userMentions.subscribe(userMentionSpy);
    component.autocompleteConfig.mentions![0].mentionSelect!(
      {
        user: { id: 'jack', name: 'Jack' },
      },
      '@'
    );

    expect(userMentionSpy).toHaveBeenCalledWith([{ id: 'jack', name: 'Jack' }]);

    const textarea = queryTextarea()!;
    const message = 'No mentions';
    textarea.value = message;
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
    });
    textarea.dispatchEvent(event);
    fixture.detectChanges();

    expect(userMentionSpy).toHaveBeenCalledWith([]);
  });

  it('should update mentioned users after value is changed', () => {
    const userMentionSpy = jasmine.createSpy();
    component.userMentions.subscribe(userMentionSpy);
    component.autocompleteConfig.mentions![0].mentionSelect!(
      {
        user: { id: 'jack', name: 'Jack' },
      },
      '@'
    );

    expect(userMentionSpy).toHaveBeenCalledWith([{ id: 'jack', name: 'Jack' }]);

    component.value = '';
    userMentionSpy.calls.reset();
    component.ngOnChanges({ value: {} as SimpleChange });

    expect(userMentionSpy).toHaveBeenCalledWith([]);
  });

  it('should disable mentions if #areMentionsEnabled is false', () => {
    expect(component.autocompleteConfig.mentions!.length).toBe(2);

    component.areMentionsEnabled = false;
    component.ngOnChanges({ areMentionsEnabled: {} as any as SimpleChange });
    fixture.detectChanges();

    expect(component.autocompleteConfig.mentions!.length).toBe(1);
  });

  it('should display autocomplete', () => {
    expect(queryAvatars().length).toBe(0);
    expect(queryUsernames().length).toBe(0);
    expect(queryCommands().length).toBe(0);

    const textarea = queryTextarea()!;
    const event = new KeyboardEvent('keydown', { key: '@' });
    textarea.dispatchEvent(event);
    fixture.detectChanges();

    expect(queryAvatars().length).toBe(3);
    expect(queryUsernames().length).toBe(3);
    expect(queryCommands().length).toBe(0);

    const event2 = new KeyboardEvent('keydown', { key: '/' });
    textarea.dispatchEvent(event2);
    fixture.detectChanges();

    expect(queryCommands().length).toBe(1);
  });

  it('should update mention options', fakeAsync(() => {
    spyOn(channelServiceMock, 'autocompleteMembers').and.callThrough();
    component.autcompleteSearchTermChanged('@so');
    tick(300);

    expect(channelServiceMock.autocompleteMembers).toHaveBeenCalledWith('so');
  }));

  it('should search in app users', () => {
    component.mentionScope = 'application';
    component.ngOnChanges({ mentionScope: {} as any as SimpleChange });

    expect(chatClientServiceMock.autocompleteUsers).toHaveBeenCalledWith('');
  });

  it('should filter autocomplete options', fakeAsync(() => {
    spyOn(channelServiceMock, 'autocompleteMembers').and.returnValue([
      { user: { id: 'dom13re4ty', name: 'Jeff' } },
      { user: { id: '3sfwer232', name: 'Dominique' } },
    ]);
    component.autcompleteSearchTermChanged('@dom');
    tick(300);

    expect(component.autocompleteConfig.mentions![0].items!.length).toBe(1);
  }));

  it('should transliterate - option contains non-Latin characters', fakeAsync(() => {
    spyOn(channelServiceMock, 'autocompleteMembers').and.returnValue([
      { user: { id: '12', name: 'Ádám' } },
    ]);
    component.autcompleteSearchTermChanged('@Adam');
    tick(300);

    expect(component.autocompleteConfig.mentions![0].items?.length).toBe(1);
  }));

  it('should transliterate - search term contains non-Latin characters', fakeAsync(() => {
    spyOn(channelServiceMock, 'autocompleteMembers').and.returnValue([
      { user: { id: '12', name: 'Adam' } },
    ]);
    component.autcompleteSearchTermChanged('@Ádám');
    tick(300);

    expect(component.autocompleteConfig.mentions![0].items?.length).toBe(1);
  }));

  it('should display textarea, and focus it', () => {
    const textarea = queryTextarea();

    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe('');
    expect(textarea?.hasAttribute('autofocus')).toBeTrue();
  });

  it('should display #value in textarea', () => {
    component.value = 'This is my message';
    fixture.detectChanges();

    expect(queryTextarea()?.value).toBe('This is my message');
  });

  it('should emit #valueChange if user types in textarea', () => {
    const spy = jasmine.createSpy();
    component.valueChange.subscribe(spy);
    const textarea = queryTextarea();
    textarea!.value = 'message';
    const event = new InputEvent('input');
    textarea?.dispatchEvent(event);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('message');
  });

  it(`shouldn't emit #valueChange if enter is hit`, () => {
    const spy = jasmine.createSpy();
    component.valueChange.subscribe(spy);
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea!.value = message;
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(event, 'preventDefault');
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
  });

  it(`shouldn't emit #send if shift+enter is hit`, () => {
    const spy = jasmine.createSpy();
    component.send.subscribe(spy);
    const textarea = queryTextarea();
    textarea!.value = 'This is my message';
    textarea?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true })
    );
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should reset mention options after mention', fakeAsync(() => {
    component.autcompleteSearchTermChanged('@Ja');
    tick(300);

    expect(component.autocompleteConfig.mentions![0].items?.length).toBe(1);

    component.autcompleteSearchTermChanged('@');
    tick();

    expect(component.autocompleteConfig.mentions![0].items?.length).toBe(3);
  }));

  it('should initialize slash commands', () => {
    expect(component.autocompleteConfig.mentions![1].items!).toEqual([
      {
        args: '[text]',
        description: 'Post a random gif to the channel',
        name: 'giphy',
        autocompleteLabel: 'giphy',
        set: 'fun_set',
        type: 'command',
      },
    ]);
  });

  it('should update textarea after command is selected', () => {
    expect(
      component.autocompleteConfig.mentions![1].mentionSelect!(
        {
          autocompleteLabel: 'giphy',
        },
        '/'
      )
    ).toBe('/giphy ');
  });

  it('should insert emoji at the correct caret position', () => {
    const textarea = queryTextarea()!;
    textarea.value = 'Emoji here: !';
    textarea.setSelectionRange(12, 12);
    const spy = jasmine.createSpy();
    component.valueChange.subscribe(spy);
    spy.calls.reset();

    emojiInput$.next('🥑');

    expect(textarea.value).toEqual('Emoji here: 🥑!');
    expect(spy).toHaveBeenCalledWith('Emoji here: 🥑!');
  });

  it('should set initial height of the textarea based on value received', () => {
    const textarea = queryTextarea();
    textarea!.value = 'This is my \n multiline message';
    component.ngAfterViewInit();
    fixture.detectChanges();

    const height = parseInt(textarea?.style.height?.replace('px', '') || '');

    expect(height).toBeGreaterThan(0);
  });
});

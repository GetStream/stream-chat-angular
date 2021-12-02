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

describe('AutocompleteTextareaComponent', () => {
  let component: AutocompleteTextareaComponent;
  let fixture: ComponentFixture<AutocompleteTextareaComponent>;
  let nativeElement: HTMLElement;
  let queryTextarea: () => HTMLTextAreaElement | null;
  let channelServiceMock: MockChannelService;
  let queryAvatars: () => HTMLElement[];
  let queryUsernames: () => HTMLElement[];
  let chatClientServiceMock: { autocompleteUsers: jasmine.Spy };

  beforeEach(async () => {
    channelServiceMock = mockChannelService();
    chatClientServiceMock = {
      autocompleteUsers: jasmine.createSpy().and.returnValue([]),
    };
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
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AutocompleteTextareaComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    queryTextarea = () =>
      nativeElement.querySelector('[data-testid="textarea"]');
    fixture.detectChanges();
    await fixture.whenStable();
    queryAvatars = () =>
      Array.from(nativeElement.querySelectorAll('[data-testclass="avatar"]'));
    queryUsernames = () =>
      Array.from(nativeElement.querySelectorAll('[data-testclass="username"]'));
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

  it('should emit #send if enter is hit', () => {
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
    channelServiceMock.activeChannel$.next({} as any as Channel);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.autocompleteConfig.mentions![0].items?.length).toBe(1);
    expect(userMentionSpy).toHaveBeenCalledWith([]);
  });

  it('should emit mentioned users', () => {
    const userMentionSpy = jasmine.createSpy();
    component.userMentions.subscribe(userMentionSpy);
    component.autocompleteConfig.mentions![0].mentionSelect!({
      user: { id: 'jack', name: 'Jack' },
    });

    expect(userMentionSpy).toHaveBeenCalledWith([{ id: 'jack', name: 'Jack' }]);

    const textarea = queryTextarea()!;
    const message = 'No mentions';
    textarea.value = message;
    const event = new InputEvent('blur');
    textarea.dispatchEvent(event);
    fixture.detectChanges();

    expect(userMentionSpy).toHaveBeenCalledWith([]);
  });

  it('should update mentioned users if sent is triggered', () => {
    const userMentionSpy = jasmine.createSpy();
    component.userMentions.subscribe(userMentionSpy);
    component.autocompleteConfig.mentions![0].mentionSelect!({
      user: { id: 'jack', name: 'Jack' },
    });

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

  it('should disable mentions if #areMentionsEnabled is false', () => {
    component.areMentionsEnabled = false;
    component.ngOnChanges({ areMentionsEnabled: {} as any as SimpleChange });
    fixture.detectChanges();

    expect(component.autocompleteConfig.mentions!.length).toBe(0);
  });

  it('should display autocomplete', () => {
    expect(queryAvatars().length).toBe(0);
    expect(queryUsernames().length).toBe(0);

    const textarea = queryTextarea()!;
    const event = new KeyboardEvent('keydown', { key: '@' });
    textarea.dispatchEvent(event);
    fixture.detectChanges();

    expect(queryAvatars().length).toBe(3);
    expect(queryUsernames().length).toBe(3);
  });

  it('should update mention options', fakeAsync(() => {
    spyOn(channelServiceMock, 'autocompleteMembers').and.callThrough();
    component.autcompleteSearchTermChanged('so');
    tick(300);

    expect(channelServiceMock.autocompleteMembers).toHaveBeenCalledWith('so');
  }));

  it('should search in app users', () => {
    component.mentionScope = 'application';
    component.ngOnChanges({ mentionScope: {} as any as SimpleChange });

    expect(chatClientServiceMock.autocompleteUsers).toHaveBeenCalledWith('');
  });

  it('should filter autocomplete options', async () => {
    spyOn(channelServiceMock, 'autocompleteMembers').and.returnValue([
      { user: { id: 'dom13re4ty', name: 'Jeff' } },
      { user: { id: '3sfwer232', name: 'Dominique' } },
    ]);
    component.autcompleteSearchTermChanged('dom');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.autocompleteConfig.mentions!.length).toBe(1);
  });

  it('should transliterate - option contains non-Latin characters', fakeAsync(() => {
    spyOn(channelServiceMock, 'autocompleteMembers').and.returnValue([
      { user: { id: '12', name: 'Ádám' } },
    ]);
    component.autcompleteSearchTermChanged('Adam');
    tick(300);

    expect(component.autocompleteConfig.mentions![0].items?.length).toBe(1);
  }));

  it('should transliterate - search term contains non-Latin characters', fakeAsync(() => {
    spyOn(channelServiceMock, 'autocompleteMembers').and.returnValue([
      { user: { id: '12', name: 'Adam' } },
    ]);
    component.autcompleteSearchTermChanged('Ádám');
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
});

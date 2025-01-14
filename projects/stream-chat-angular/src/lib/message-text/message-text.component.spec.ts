import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageTextComponent } from './message-text.component';
import { StreamMessage } from '../types';
import { SimpleChange } from '@angular/core';
import { MessageService } from '../message.service';
import { generateMockMessages } from '../mocks';

describe('MessageTextComponent', () => {
  let component: MessageTextComponent;
  let fixture: ComponentFixture<MessageTextComponent>;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MessageTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    nativeElement = fixture.nativeElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display text', () => {
    component.message = {
      text: 'Hi',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(
      nativeElement.querySelector('[data-testid="text"]')?.textContent
    ).toContain('Hi');
  });

  it('should add class to quoted message text', () => {
    component.message = {
      text: 'Hi',
      translation: 'Szia',
    } as StreamMessage;
    component.isQuoted = true;
    component.ngOnChanges({ isQuoted: {} as SimpleChange });
    fixture.detectChanges();

    expect(
      nativeElement.querySelector('.str-chat__quoted-message-text-value')
    ).not.toBeNull();

    component.isQuoted = false;
    component.ngOnChanges({ isQuoted: {} as SimpleChange });
    fixture.detectChanges();

    expect(
      nativeElement.querySelector('.str-chat__quoted-message-text-value')
    ).toBeNull();
  });

  it('should translate, if #shouldTranslate is true', () => {
    component.message = {
      text: 'Hi',
      translation: 'Szia',
    } as StreamMessage;
    component.shouldTranslate = true;
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(
      nativeElement.querySelector('[data-testid="text"]')?.textContent
    ).toContain('Szia');
  });

  it('should fallback to original text, if #shouldTranslate is true but no translation is provided', () => {
    component.message = {
      text: 'Hi',
      translation: '',
    } as StreamMessage;
    component.shouldTranslate = true;
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(
      nativeElement.querySelector('[data-testid="text"]')?.textContent
    ).toContain('Hi');
  });

  it(`shouldn't display empty text`, () => {
    component.message = {
      text: '',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(nativeElement.querySelector('[data-testid="text"]')).toBeNull();
  });

  it('should create message parts', () => {
    component.message = {
      text: '',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual(undefined);
    expect(component.messageText).toEqual('');

    component.message = {
      text: 'This is a message without user mentions',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual(undefined);
    expect(component.messageText).toEqual(
      'This is a message without user mentions'
    );

    component.message = {
      text: 'This is just an email, not a mention test@test.com',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual(undefined);
    expect(component.messageText).toEqual(
      'This is just an email, not a mention test@test.com'
    );

    component.message = {
      text: 'This is just an email, not a mention test@test.com',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual(undefined);
    expect(component.messageText).toEqual(
      'This is just an email, not a mention test@test.com'
    );

    component.message = {
      text: 'Hello @Jack',
      mentioned_users: [{ id: 'jack', name: 'Jack' }],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      { content: 'Hello ', type: 'text' },
      {
        content: '@Jack',
        type: 'mention',
        user: { id: 'jack', name: 'Jack' },
      },
    ]);

    component.message = {
      text: 'Hello @Jack, how are you?',
      mentioned_users: [{ id: 'jack', name: 'Jack' }],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      { content: 'Hello ', type: 'text' },
      {
        content: '@Jack',
        type: 'mention',
        user: { id: 'jack', name: 'Jack' },
      },
      { content: ', how are you?', type: 'text' },
    ]);

    component.message = {
      text: 'Hello @Jack and @Lucie, how are you?',
      mentioned_users: [
        { id: 'id2334', name: 'Jack' },
        { id: 'id3444', name: 'Lucie' },
      ],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      { content: 'Hello ', type: 'text' },
      {
        content: '@Jack',
        type: 'mention',
        user: { id: 'id2334', name: 'Jack' },
      },
      { content: ' and ', type: 'text' },
      {
        content: '@Lucie',
        type: 'mention',
        user: { id: 'id3444', name: 'Lucie' },
      },
      { content: ', how are you?', type: 'text' },
    ]);

    component.message = {
      text: 'https://getstream.io/ this is the link @sara',
      mentioned_users: [{ id: 'sara' }],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      {
        content:
          '<a href="https://getstream.io/" target="_blank" rel="nofollow">https://getstream.io/</a> this is the link ',
        type: 'text',
      },
      { content: '@sara', type: 'mention', user: { id: 'sara' } },
    ]);

    component.message = {
      text: `This is a message with lots of emojis: 😂😜😂😂, there are compound emojis as well 👨‍👩‍👧`,
      html: `This is a message with lots of emojis: 😂😜😂😂, there are compound emojis as well 👨‍👩‍👧`,
      mentioned_users: [],
    } as any as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    const content = component.messageTextParts![0].content;

    expect(content).toContain('😂');
    expect(content).toContain('😜');
    expect(content).toContain('👨‍👩‍👧');
  });

  it('should add class to emojis in Chrome', () => {
    const chrome = (window as typeof window & { chrome: Object }).chrome;
    (window as typeof window & { chrome: Object }).chrome =
      'the component now will think that this is a chrome browser';
    component.message = {
      text: 'This message contains an emoji 🥑',
      html: 'This message contains an emoji 🥑',
    } as any as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      'class="str-chat__emoji-display-fix"'
    );

    component.message = {
      text: '@sara what do you think about 🥑s? ',
      html: '@sara what do you think about 🥑s? ',
      mentioned_users: [{ id: 'sara' }],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![2].content).toContain(
      'class="str-chat__emoji-display-fix"'
    );

    // Simulate a browser that isn't Google Chrome
    (window as typeof window & { chrome: Object | undefined }).chrome =
      undefined;

    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).not.toContain(
      'class="str-chat__emoji-display-fix"'
    );

    // Revert changes to the window object
    (window as typeof window & { chrome: Object }).chrome = chrome;
  });

  it('should replace URL links inside text content', () => {
    component.message = {
      html: '<p>This is a message with a link <a href="https://getstream.io/" rel="nofollow">https://getstream.io/</a></p>\n',
      text: 'This is a message with a link https://getstream.io/',
    } as any as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      ' <a href="https://getstream.io/" target="_blank" rel="nofollow">https://getstream.io/</a>'
    );

    component.message.html = undefined;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      '<a href="https://getstream.io/" target="_blank" rel="nofollow">https://getstream.io/</a>'
    );

    component.message.text = 'This is a message with a link google.com';
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      '<a href="https://google.com" target="_blank" rel="nofollow">google.com</a>'
    );

    component.message.text = 'This is a message with a link www.google.com';
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      '<a href="https://www.google.com" target="_blank" rel="nofollow">www.google.com</a>'
    );

    component.message.text =
      'This is a message with a link file:///C:/Users/YourName/Documents/example.txt';
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      '<a href="file:///C:/Users/YourName/Documents/example.txt" target="_blank" rel="nofollow">file:///C:/Users/YourName/Documents/example.txt</a>'
    );
  });

  it('should replace URL links inside text content - custom link renderer', () => {
    const service = TestBed.inject(MessageService);
    service.customLinkRenderer = (url) =>
      `<a href="${url}" class="my-special-class">${url}</a>`;
    component.message = {
      html: '<p>This is a message with a link <a href="https://getstream.io/" rel="nofollow">https://getstream.io/</a></p>\n',
      text: 'This is a message with a link https://getstream.io/',
    } as any as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      ' <a href="https://getstream.io/" class="my-special-class">https://getstream.io/</a>'
    );
  });

  it('should respect #displayAs setting', () => {
    component.message = generateMockMessages()[0];
    fixture.detectChanges();

    expect(nativeElement.querySelector('[data-testid="html-content"]')).toBe(
      null
    );

    component.displayAs = 'html';
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(
      nativeElement.querySelector('[data-testid="html-content"]')
    ).not.toBe(null);
  });
});

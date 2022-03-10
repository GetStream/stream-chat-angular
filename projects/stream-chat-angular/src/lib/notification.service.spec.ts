import { TemplateRef } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let spy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
    spy = jasmine.createSpy();
    service.notifications$.subscribe(spy);
  });

  it('should add temporary notification', () => {
    const text = 'Connection lost';
    const type = 'error';
    service.addTemporaryNotification(text, type);

    expect(spy).toHaveBeenCalledWith([
      jasmine.objectContaining({ text, type, translateParams: undefined }),
    ]);
  });

  it('should remove notification, after given time ends', fakeAsync(() => {
    const text = 'Connection lost';
    const type = 'error';
    service.addTemporaryNotification(text, type);

    expect(spy).toHaveBeenCalledWith([
      jasmine.objectContaining({ text, type }),
    ]);

    tick(5000);

    expect(spy).toHaveBeenCalledWith([]);
  }));

  it('should add permanent notification', fakeAsync(() => {
    const text = 'Connection lost, recconest after {{timeout}}ms';
    const type = 'error';
    const translateParams = { timeout: 5000 };
    service.addPermanentNotification(text, type, translateParams);

    expect(spy).toHaveBeenCalledWith([
      jasmine.objectContaining({ text, type, translateParams }),
    ]);
    spy.calls.reset();

    tick(5000);

    expect(spy).not.toHaveBeenCalled();
  }));

  it('should remove notification', () => {
    const text = 'Connection lost';
    const type = 'error';
    const remove = service.addPermanentNotification(text, type);
    remove();

    expect(spy).toHaveBeenCalledWith([]);
  });

  it('should add HTML notification - temporary notification', () => {
    const template = { template: 'template' } as any as TemplateRef<any>;
    const templateContext = { channelName: 'gardening' };
    service.addTemporaryNotification(
      template,
      'success',
      5000,
      undefined,
      templateContext
    );

    expect(spy).toHaveBeenCalledWith([
      jasmine.objectContaining({ templateContext, template }),
    ]);
  });

  it('should add HTML notification - permanent notification', () => {
    const template = { template: 'template' } as any as TemplateRef<any>;
    const templateContext = { channelName: 'gardening' };
    service.addPermanentNotification(
      template,
      'success',
      undefined,
      templateContext
    );

    expect(spy).toHaveBeenCalledWith([
      jasmine.objectContaining({ templateContext, template }),
    ]);
  });
});

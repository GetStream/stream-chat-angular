import {
  ComponentRef,
  EventEmitter,
  SimpleChange,
  ViewContainerRef,
} from '@angular/core';
import { TextareaDirective } from './textarea.directive';
import { TextareaInterface } from './textarea.interface';

describe('TextareaDirective', () => {
  let mockComponent: TextareaInterface;
  let directive: TextareaDirective;

  beforeEach(() => {
    directive = new TextareaDirective({} as ViewContainerRef);
    mockComponent = {
      value: '',
      valueChange: new EventEmitter<string>(),
      send: new EventEmitter<void>(),
    };
    directive.componentRef = {
      instance: mockComponent,
    } as ComponentRef<TextareaInterface>;
  });

  it('should pass on #value', () => {
    directive.value = 'this is my message';
    directive.ngOnChanges({ value: {} as any as SimpleChange });

    expect(mockComponent.value).toEqual('this is my message');
  });

  it('should emit when component emits #valueChange', () => {
    const spy = jasmine.createSpy();
    directive.valueChange.subscribe(spy);
    directive.ngOnChanges({ componentRef: {} as any as SimpleChange });
    mockComponent.valueChange.next('Hi');

    expect(spy).toHaveBeenCalledWith('Hi');
  });

  it('should emit when component emits #send', () => {
    const spy = jasmine.createSpy();
    directive.send.subscribe(spy);
    directive.ngOnChanges({ componentRef: {} as any as SimpleChange });
    mockComponent.send.next();

    expect(spy).toHaveBeenCalledWith(undefined);
  });
});

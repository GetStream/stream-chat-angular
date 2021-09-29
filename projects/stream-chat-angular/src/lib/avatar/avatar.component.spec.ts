import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let component: AvatarComponent;
  let fixture: ComponentFixture<AvatarComponent>;
  let nativeElement: HTMLElement;
  const imageUrl = 'https://picsum.photos/200/300';
  let queryImg: () => HTMLImageElement | null;
  let queryFallbackImg: () => HTMLImageElement | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AvatarComponent],
    });
    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    queryFallbackImg = () =>
      nativeElement.querySelector('[data-testid=fallback-img]');
    queryImg = () => nativeElement.querySelector('[data-testid=avatar-img]');
  });

  const waitForImgComplete = () => {
    const img = queryImg();
    return new Promise((resolve, reject) => {
      if (!img) {
        return reject();
      }
      img.addEventListener('load', () => resolve(undefined));
      img.addEventListener('error', () => resolve(undefined));
    });
  };

  it('should display image', async () => {
    component.imageUrl = imageUrl;
    fixture.detectChanges();
    await waitForImgComplete();
    fixture.detectChanges();
    const img = queryImg();
    const fallbackImg = queryFallbackImg();

    expect(img).not.toBeNull();
    expect(fallbackImg).toBeNull();
    expect(img!.src).toBe(imageUrl);
    expect(
      img!.classList.contains('str-chat__avatar-image--loaded')
    ).toBeTrue();
  });

  it('should display image with the provided #size', () => {
    const size = 20;
    component.size = size;
    component.imageUrl = imageUrl;
    fixture.detectChanges();
    const img = queryImg();

    expect(img?.offsetHeight).toBe(size);
  });

  it(`should display fallback image if #imageUrl couldn't be loaded`, async () => {
    component.imageUrl = imageUrl + 'not-existing';
    fixture.detectChanges();
    await waitForImgComplete();
    fixture.detectChanges();
    const img = queryImg();
    const fallbackImg = queryFallbackImg();

    expect(img).toBeNull();
    expect(fallbackImg).not.toBeNull();
  });

  it(`should display fallback image if #imageUrl wasn't provided`, () => {
    component.name = 'John Doe';
    fixture.detectChanges();
    const img = queryImg();
    const fallbackImg = queryFallbackImg();

    expect(img).toBeNull();
    expect(fallbackImg).not.toBeNull();
    expect(fallbackImg!.textContent?.replace(/ /g, '')).toBe('J');
    expect(fallbackImg!.parentElement?.offsetHeight).toBe(component.size);
  });

  it('should display initials correctly', () => {
    component.name = 'John Doe';
    fixture.detectChanges();

    expect(component.initials).toBe('J');

    component.name = 'Johhny';
    fixture.detectChanges();

    expect(component.initials).toBe('J');

    component.name = undefined;
    fixture.detectChanges();

    expect(component.initials).toBe('');
  });
});

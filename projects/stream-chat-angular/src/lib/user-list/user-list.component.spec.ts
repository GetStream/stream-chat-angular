import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { UserListComponent } from './user-list.component';
import { PaginatedListComponent } from '../paginated-list/paginated-list.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { By } from '@angular/platform-browser';
import { StreamAvatarModule } from '../stream-avatar.module';
import { UserResponse } from 'stream-chat';
import { TranslateModule } from '@ngx-translate/core';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreamAvatarModule, TranslateModule.forRoot()],
      declarations: [UserListComponent, PaginatedListComponent],
    })
      .overrideComponent(UserListComponent, {
        set: { changeDetection: ChangeDetectionStrategy.Default },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display users', () => {
    component.users = [
      { id: 'jane', name: 'Jane', image: 'link/to/image' },
      { id: 'jack', name: 'Jack', image: 'link/to/image2' },
    ];
    fixture.detectChanges();

    const userNames = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '[data-testclass="username"]',
    );

    expect(userNames.length).toBe(component.users.length);

    Array.from(userNames).forEach((user, index) => {
      expect(user.textContent).toContain(component.users[index].name);
    });

    const avatars = fixture.debugElement
      .queryAll(By.directive(AvatarComponent))
      .map((c) => c.componentInstance as AvatarComponent);

    expect(avatars.length).toBe(component.users.length);

    avatars.forEach((avatar, index) => {
      expect(avatar.name).toBe(component.users[index].name);
      expect(avatar.imageUrl).toBe(component.users[index].image);
      expect(avatar.type).toBe('user');
      expect(avatar.location).toBe('reaction');
    });
  });

  it('should provide data to paginated list component', () => {
    const users = [
      { id: 'jane', name: 'Jane', image: 'link/to/image' },
      { id: 'jack', name: 'Jack', image: 'link/to/image2' },
    ];
    component.users = users;
    component.hasMore = true;
    component.isLoading = true;
    const spy = jasmine.createSpy();
    component.loadMore.subscribe(spy);
    fixture.detectChanges();

    const paginatedListComponent = fixture.debugElement.query(
      By.directive(PaginatedListComponent),
    ).componentInstance as PaginatedListComponent<UserResponse>;

    expect(paginatedListComponent.items).toBe(users);

    expect(paginatedListComponent.hasMore).toBe(true);

    expect(paginatedListComponent.isLoading).toBe(true);

    expect(spy).toHaveBeenCalledTimes(0);

    paginatedListComponent.loadMore.next();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(paginatedListComponent.trackBy).toBe(component.trackByUserId);
  });
});

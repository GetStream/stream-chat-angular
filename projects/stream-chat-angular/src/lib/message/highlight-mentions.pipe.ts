import { Pipe, PipeTransform } from '@angular/core';
import { UserResponse } from 'stream-chat';

@Pipe({
  name: 'highlightMentions',
})
export class HighlightMentionsPipe implements PipeTransform {
  transform(value?: string, mentionedUsers?: UserResponse[]): string {
    if (!value || !mentionedUsers) {
      return value || '';
    }
    let result = value;
    mentionedUsers.forEach((u) => {
      result = result.replace(
        new RegExp(`@${u.name || u.id}`, 'g'),
        `<b>@${u.name || u.id}</b>`
      );
    });

    return result;
  }
}

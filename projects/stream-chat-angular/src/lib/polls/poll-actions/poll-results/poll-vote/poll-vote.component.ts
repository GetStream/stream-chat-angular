import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { nsToDate, PollVoteResponseData, TimestampNS } from 'stream-chat';
import { DateParserService } from '../../../../date-parser.service';

/**
 *
 */
@Component({
  selector: 'stream-poll-vote',
  templateUrl: './poll-vote.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollVoteComponent {
  /**
   * The poll vote or answer to display
   */
  @Input() vote: PollVoteResponseData | undefined;
  anonymousTranslation = 'Anonymous';

  constructor(
    private translateService: TranslateService,
    private dateParser: DateParserService
  ) {
    this.translateService
      .get('streamChat.Anonymous')
      .subscribe((translation: string) => {
        this.anonymousTranslation = translation;
      });
  }

  parseDate(date: TimestampNS) {
    return this.dateParser.parseDateTime(nsToDate(date));
  }
}

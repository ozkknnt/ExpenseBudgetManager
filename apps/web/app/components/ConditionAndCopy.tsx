import { CopyEventDataForm } from './CopyEventDataForm';
import { copyEventDataAction, type EventItem } from '../lib/dashboard';

type ConditionAndCopyProps = {
  actionPath: '/budget' | '/actual' | '/graph' | '/categories' | '/copy';
  currentYear: number;
  fiscalYear: number;
  eventCode: string;
  events: EventItem[];
};

export function ConditionAndCopy({
  actionPath,
  currentYear,
  fiscalYear,
  eventCode,
  events
}: ConditionAndCopyProps) {
  return (
    <section className="sectionBlock">
      <h2 className="sectionTitle">条件指定・全コピー</h2>
      <form className="controls" method="get" action={actionPath}>
        <label>
          <span>年度</span>
          <input
            type="number"
            name="fiscalYear"
            defaultValue={Number.isInteger(fiscalYear) ? fiscalYear : currentYear}
            min={2000}
            max={2100}
          />
        </label>

        <label>
          <span>イベント</span>
          <select name="eventCode" defaultValue={eventCode}>
            {events.map((event) => (
              <option key={event.eventId} value={event.eventCode}>
                {event.eventCode}
              </option>
            ))}
          </select>
        </label>

        <button type="submit">表示</button>
      </form>

      <CopyEventDataForm
        events={events}
        fiscalYear={fiscalYear}
        selectedEventCode={eventCode}
        returnPath={actionPath}
        action={copyEventDataAction}
      />
    </section>
  );
}

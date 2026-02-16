'use client';

import { useMemo, useState } from 'react';

type EventItem = {
  eventId: string;
  eventCode: string;
  eventName: string;
  eventOrder: number;
};

type CopyEventDataFormProps = {
  events: EventItem[];
  fiscalYear: number;
  selectedEventCode: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function CopyEventDataForm({
  events,
  fiscalYear,
  selectedEventCode,
  action
}: CopyEventDataFormProps) {
  const initialToEventCode =
    events.find((event) => event.eventCode !== selectedEventCode)?.eventCode ?? selectedEventCode;

  const [fromFiscalYear, setFromFiscalYear] = useState(String(fiscalYear));
  const [fromEventCode, setFromEventCode] = useState(selectedEventCode);
  const [toFiscalYear, setToFiscalYear] = useState(String(fiscalYear + 1));
  const [toEventCode, setToEventCode] = useState(initialToEventCode);

  const fromFiscalYearNum = Number(fromFiscalYear);
  const toFiscalYearNum = Number(toFiscalYear);

  const destinationEvents = useMemo(
    () => events.filter((event) => event.eventCode !== fromEventCode),
    [events, fromEventCode]
  );

  const canSubmit =
    Number.isInteger(fromFiscalYearNum) &&
    Number.isInteger(toFiscalYearNum) &&
    toFiscalYearNum > fromFiscalYearNum &&
    fromEventCode !== toEventCode &&
    toEventCode.length > 0;

  return (
    <form className="createForm copyForm" action={action}>
      <label>
        <span>コピー元年度</span>
        <input
          name="fromFiscalYear"
          type="number"
          min={2000}
          max={2100}
          value={fromFiscalYear}
          onChange={(e) => setFromFiscalYear(e.target.value)}
          required
        />
      </label>

      <label>
        <span>コピー元イベント</span>
        <select
          name="fromEventCode"
          value={fromEventCode}
          onChange={(e) => {
            const nextFromEventCode = e.target.value;
            setFromEventCode(nextFromEventCode);
            if (toEventCode === nextFromEventCode) {
              const nextTo = events.find((event) => event.eventCode !== nextFromEventCode);
              setToEventCode(nextTo?.eventCode ?? '');
            }
          }}
          required
        >
          {events.map((event) => (
            <option key={`src-${event.eventId}`} value={event.eventCode}>
              {event.eventCode}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>コピー先年度</span>
        <input
          name="toFiscalYear"
          type="number"
          min={2000}
          max={2100}
          value={toFiscalYear}
          onChange={(e) => setToFiscalYear(e.target.value)}
          required
        />
      </label>

      <label>
        <span>コピー先イベント</span>
        <select
          name="toEventCode"
          value={toEventCode}
          onChange={(e) => setToEventCode(e.target.value)}
          required
        >
          {destinationEvents.map((event) => (
            <option key={`dst-${event.eventId}`} value={event.eventCode}>
              {event.eventCode}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" disabled={!canSubmit}>
        コピー実行
      </button>

      {!canSubmit && (
        <p className="copyFormHint">コピー先はコピー元より未来年度、かつ別イベントを指定してください。</p>
      )}
    </form>
  );
}

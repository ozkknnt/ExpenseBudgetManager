import { DashboardShell } from '../components/DashboardShell';
import {
  MAX_FISCAL_YEAR,
  MIN_FISCAL_YEAR,
  formatYen,
  getEventSummary,
  getEvents,
  resolveContext,
  type SearchParams
} from '../lib/dashboard';

type GraphPageProps = {
  searchParams?: SearchParams;
};

export default async function GraphPage({ searchParams }: GraphPageProps) {
  const events = await getEvents();
  const { fiscalYear, eventCode } = resolveContext(searchParams, events);
  const fallbackCompareEventCode =
    events.find((event) => event.eventCode !== eventCode)?.eventCode ?? eventCode;
  const compareEventCode = searchParams?.compareEventCode ?? fallbackCompareEventCode;

  const selectedPrimaryEvent = events.find((event) => event.eventCode === eventCode) ?? events[0];
  const selectedCompareEvent =
    events.find((event) => event.eventCode === compareEventCode) ??
    events.find((event) => event.eventCode !== selectedPrimaryEvent?.eventCode) ??
    selectedPrimaryEvent;

  const selectedEventCodes =
    selectedPrimaryEvent && selectedCompareEvent
      ? [selectedPrimaryEvent.eventCode, selectedCompareEvent.eventCode]
      : [];

  const summaries = Number.isInteger(fiscalYear)
    ? await Promise.all(
        selectedEventCodes.map(async (code) => ({
          event: events.find((event) => event.eventCode === code),
          summary: await getEventSummary(fiscalYear, code)
        }))
      )
    : [];

  const chartRows: Array<{
    event: { eventId: string; eventCode: string; eventName: string; eventOrder: number };
    seriesMap: Map<string, number>;
    total: number;
  }> = [];

  for (const entry of summaries) {
    if (!entry.event || !entry.summary) {
      continue;
    }
    const seriesMap = new Map(entry.summary.series.map((row) => [row.expenseCategoryCode, row.amount]));
    const total = entry.summary.series.reduce((sum, row) => sum + row.amount, 0);
    chartRows.push({ event: entry.event, seriesMap, total });
  }

  const allCategoryCodes = Array.from(
    new Set(chartRows.flatMap((row) => Array.from(row.seriesMap.keys())))
  ).sort((a, b) => a.localeCompare(b));

  const codeToName = new Map<string, string>();
  for (const { summary } of summaries) {
    if (!summary) continue;
    for (const row of summary.series) {
      if (!codeToName.has(row.expenseCategoryCode)) {
        codeToName.set(row.expenseCategoryCode, row.expenseCategoryName);
      }
    }
  }

  const maxTotal = chartRows.reduce((max, row) => Math.max(max, row.total), 0);
  const hasAnyData = chartRows.some((row) => row.total > 0);
  const palette = [
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#ca8a04',
    '#7c3aed',
    '#0891b2',
    '#ea580c',
    '#db2777'
  ];

  return (
    <DashboardShell
      currentPath="/graph"
      fiscalYear={fiscalYear}
      eventCode={eventCode}
      message={searchParams?.message}
      error={searchParams?.error}
    >
      <section className="sectionBlock">
        <h2 className="sectionTitle">イベント別 積み上げグラフ</h2>
        <p className="sub">API: /reports/event-summary</p>
        <form className="controls graphControls" method="get" action="/graph">
          <label>
            <span>年度</span>
            <input
              type="number"
              name="fiscalYear"
              defaultValue={Number.isInteger(fiscalYear) ? fiscalYear : new Date().getFullYear()}
              min={MIN_FISCAL_YEAR}
              max={MAX_FISCAL_YEAR}
            />
          </label>
          <label>
            <span>イベント1</span>
            <select name="eventCode" defaultValue={selectedPrimaryEvent?.eventCode ?? ''}>
              {events.map((event) => (
                <option key={`event-1-${event.eventId}`} value={event.eventCode}>
                  {event.eventCode}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>イベント2</span>
            <select name="compareEventCode" defaultValue={selectedCompareEvent?.eventCode ?? ''}>
              {events.map((event) => (
                <option key={`event-2-${event.eventId}`} value={event.eventCode}>
                  {event.eventCode}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">表示</button>
        </form>

        {!Number.isInteger(fiscalYear) ? (
          <p className="muted">集計データを取得できませんでした。</p>
        ) : selectedPrimaryEvent?.eventCode === selectedCompareEvent?.eventCode ? (
          <p className="notice error">イベント1とイベント2は別のイベントを選択してください。</p>
        ) : !hasAnyData ? (
          <p className="muted">対象データがありません。</p>
        ) : (
          <>
            <div className="stackedVerticalChart" role="img" aria-label="イベント別の費目コード積み上げ棒グラフ">
              {chartRows.map((row) => (
                <div key={row.event.eventId} className="stackedVerticalColumn">
                  <div className="stackedVerticalBar">
                    {allCategoryCodes.map((code, idx) => {
                      const amount = row.seriesMap.get(code) ?? 0;
                      if (amount <= 0 || maxTotal <= 0) {
                        return null;
                      }
                      const ratio = (amount / maxTotal) * 100;
                      const color = palette[idx % palette.length];
                      return (
                        <div
                          key={`${row.event.eventId}-${code}`}
                          className="stackedVerticalSegment"
                          style={{ height: `${Math.max(ratio, 2)}%`, backgroundColor: color }}
                          title={`${row.event.eventCode} / ${code}: ${formatYen(amount)} 円`}
                        />
                      );
                    })}
                  </div>
                  <p className="stackedVerticalEventCode">{row.event.eventCode}</p>
                  <p className="stackedVerticalTotal">{formatYen(row.total)} 円</p>
                </div>
              ))}
            </div>

            <ul className="stackedLegend">
              {allCategoryCodes.map((code, idx) => (
                <li key={`legend-${code}`}>
                  <span
                    className="stackedLegendSwatch"
                    style={{ backgroundColor: palette[idx % palette.length] }}
                    aria-hidden
                  />
                  <span className="code">{code}</span>
                  <span>{codeToName.get(code) ?? '-'}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </DashboardShell>
  );
}

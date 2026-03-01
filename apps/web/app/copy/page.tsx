import { ConditionAndCopy } from '../components/ConditionAndCopy';
import { DashboardShell } from '../components/DashboardShell';
import { getEvents, resolveContext, type SearchParams } from '../lib/dashboard';

type CopyPageProps = {
  searchParams?: SearchParams;
};

export default async function CopyPage({ searchParams }: CopyPageProps) {
  const events = await getEvents();
  const { currentYear, fiscalYear, eventCode } = resolveContext(searchParams, events);

  return (
    <DashboardShell
      currentPath="/copy"
      fiscalYear={fiscalYear}
      eventCode={eventCode}
      message={searchParams?.message}
      error={searchParams?.error}
    >
      <ConditionAndCopy
        actionPath="/copy"
        currentYear={currentYear}
        fiscalYear={fiscalYear}
        eventCode={eventCode}
        events={events}
      />
    </DashboardShell>
  );
}

type EventItem = {
  eventId: string;
  eventCode: string;
  eventName: string;
  eventOrder: number;
};

async function getEvents(): Promise<EventItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/events`, { cache: 'no-store' });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export default async function Home() {
  const events = await getEvents();

  return (
    <main className="page">
      <section className="card">
        <p className="badge">monorepo bootstrap succeeded</p>
        <h1>Expense Budget Manager</h1>
        <p className="sub">API: /events</p>
        <ul className="list">
          {events.length === 0 && <li className="muted">No events</li>}
          {events.map((event) => (
            <li key={event.eventId}>
              <span className="code">{event.eventCode}</span>
              <span>{event.eventName}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

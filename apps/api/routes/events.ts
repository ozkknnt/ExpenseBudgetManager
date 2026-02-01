import { Hono } from "hono";
import { prisma } from "db"; // あなたの packages/db の export に合わせて

export const eventsRoute = new Hono();

eventsRoute.get("/events", async (c) => {
  try {
    const rows = await prisma.mstEvent.findMany({
      where: { delFlg: false },
      orderBy: { eventOrder: "asc" },
      select: {
        eventId: true,
        eventCode: true,
        eventName: true,
        eventOrder: true,
      },
    });
    return c.json(rows);
  } catch (e) {
    console.error("GET /events failed:", e);
    return c.text("Internal Server Error", 500);
  }
});

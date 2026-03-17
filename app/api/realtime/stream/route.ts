export const runtime = "nodejs";

function buildSnapshot() {
  const minuteSeed = new Date().getMinutes();

  return {
    timestamp: new Date().toISOString(),
    waitingPatients: 4 + (minuteSeed % 5),
    activeChairs: 2 + (minuteSeed % 3),
    alerts: minuteSeed % 2,
  };
}

export async function GET() {
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        controller.enqueue(`data: ${JSON.stringify(buildSnapshot())}\n\n`);
      };

      send();
      interval = setInterval(send, 5000);
    },
    cancel() {
      if (interval) {
        clearInterval(interval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

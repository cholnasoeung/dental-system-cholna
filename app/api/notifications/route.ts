import { NextResponse } from "next/server";

import type { NotificationRecord } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";

type NotificationDocument = Omit<NotificationRecord, "id"> & {
  _id?: string;
};

function serializeNotification(
  notification: NotificationDocument & { _id: unknown },
): NotificationRecord {
  return {
    id: String(notification._id),
    patientId: notification.patientId,
    patientName: notification.patientName,
    category: notification.category,
    channel: notification.channel,
    recipient: notification.recipient,
    subject: notification.subject,
    message: notification.message,
    scheduledFor: notification.scheduledFor,
    status: notification.status,
    relatedAppointmentId: notification.relatedAppointmentId,
    relatedInvoiceId: notification.relatedInvoiceId,
  };
}

function errorResponse(message: string, error: unknown) {
  return NextResponse.json(
    {
      error: message,
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const db = await getDatabase();
    const notifications = await db
      .collection<NotificationDocument>("notifications")
      .find({})
      .sort({ scheduledFor: -1, _id: -1 })
      .toArray();

    return NextResponse.json(
      notifications.map((notification) =>
        serializeNotification(
          notification as NotificationDocument & { _id: unknown },
        ),
      ),
    );
  } catch (error) {
    console.error("GET /api/notifications failed", error);
    return errorResponse("Failed to load notifications from MongoDB.", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Omit<NotificationRecord, "id">;
    const db = await getDatabase();
    const result = await db
      .collection<Omit<NotificationRecord, "id">>("notifications")
      .insertOne(payload);

    return NextResponse.json(
      {
        id: String(result.insertedId),
        ...payload,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/notifications failed", error);
    return errorResponse("Failed to save notification to MongoDB.", error);
  }
}

import { NextResponse } from "next/server";

import type { StaffMember } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";

type StaffDocument = Omit<StaffMember, "id"> & {
  _id?: string;
};

function serializeStaff(member: StaffDocument & { _id: unknown }): StaffMember {
  return {
    id: String(member._id),
    fullName: member.fullName,
    role: member.role,
    email: member.email,
    phone: member.phone,
    permissions: member.permissions ?? [],
    schedule: member.schedule ?? [],
    availabilityStatus: member.availabilityStatus,
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
    const members = await db
      .collection<StaffDocument>("staff")
      .find({})
      .sort({ role: 1, fullName: 1 })
      .toArray();

    return NextResponse.json(
      members.map((member) => serializeStaff(member as StaffDocument & { _id: unknown })),
    );
  } catch (error) {
    console.error("GET /api/staff failed", error);
    return errorResponse("Failed to load staff from MongoDB.", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Omit<StaffMember, "id">;
    const db = await getDatabase();
    const result = await db.collection<Omit<StaffMember, "id">>("staff").insertOne(payload);

    return NextResponse.json(
      {
        id: String(result.insertedId),
        ...payload,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/staff failed", error);
    return errorResponse("Failed to save staff member to MongoDB.", error);
  }
}

import { NextResponse } from "next/server";

import { patientNoteTypeOptions, type PatientTimelineNote } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import { createPatientNote, type PatientNoteDocument } from "@/lib/patients";

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const db = await getDatabase();
    const notes = await db
      .collection<PatientNoteDocument>("patientNotes")
      .find({ patientId: id })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    return NextResponse.json(
      notes.map(
        (note) =>
          ({
            id: String(note._id),
            patientId: note.patientId,
            createdAt: note.createdAt,
            staffUser: note.staffUser,
            noteType: note.noteType,
            content: note.content,
          }) satisfies PatientTimelineNote,
      ),
    );
  } catch (error) {
    console.error("GET /api/patients/[id]/notes failed", error);
    return errorResponse("Failed to load patient notes.", error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      staffUser?: string;
      noteType?: PatientTimelineNote["noteType"];
      content?: string;
    };

    if (!payload.content?.trim()) {
      return NextResponse.json({ error: "Note content is required." }, { status: 400 });
    }

    if (!payload.noteType || !patientNoteTypeOptions.includes(payload.noteType)) {
      return NextResponse.json({ error: "Invalid note type." }, { status: 400 });
    }

    const db = await getDatabase();
    const note = createPatientNote(id, payload.staffUser ?? "Clinic staff", payload.noteType, payload.content);
    const result = await db.collection<PatientNoteDocument>("patientNotes").insertOne({
      patientId: note.patientId,
      createdAt: note.createdAt,
      staffUser: note.staffUser,
      noteType: note.noteType,
      content: note.content,
    });

    return NextResponse.json({ ...note, id: String(result.insertedId) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/patients/[id]/notes failed", error);
    return errorResponse("Failed to save patient note.", error);
  }
}

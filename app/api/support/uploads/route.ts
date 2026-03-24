import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { getStaffSupportSession, supportErrorResponse, verifyPortalPatientAccess } from "@/lib/support";

export const runtime = "nodejs";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const patientId = String(formData.get("patientId") ?? "");
    const portalDob = String(formData.get("portalDob") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const staffSession = await getStaffSupportSession(request);
    if (!staffSession) {
      const patient = await verifyPortalPatientAccess({ patientId, portalDob });
      if (!patient) {
        return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
      }
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), "public", "support-uploads");
    await mkdir(uploadsDir, { recursive: true });

    const storedName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const filePath = path.join(uploadsDir, storedName);
    await writeFile(filePath, bytes);

    return NextResponse.json({
      id: storedName,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      url: `/support-uploads/${storedName}`,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/support/uploads failed", error);
    return supportErrorResponse("Failed to upload support file.", error);
  }
}

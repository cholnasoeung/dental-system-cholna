import oracledb from "oracledb";
import { NextResponse } from "next/server";

import { withOracleConnection } from "@/lib/oracle";

export async function GET() {
  try {
    const result = await withOracleConnection<{ rows?: Array<{ MESSAGE: string }> }>((connection) =>
      connection.execute<{ MESSAGE: string }>(
        `SELECT 'Oracle 21c connection is working' AS MESSAGE FROM dual`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      ),
    );

    return NextResponse.json({
      ok: true,
      rows: result.rows ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to connect to Oracle.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

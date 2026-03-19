# Oracle Setup Guide

This project is currently built on MongoDB.

You can see that in:

- `lib/mongodb.ts`
- `app/api/**/route.ts`
- multiple API handlers that use MongoDB collections and `ObjectId`

That means connecting to Oracle has two parts:

1. Add an Oracle connection.
2. Migrate the API routes from MongoDB queries to SQL.

## 1. Install the Oracle driver

Run:

```bash
npm install oracledb
```

If you are using a recent version of `oracledb`, the default Thin mode is usually enough to connect without installing Oracle Instant Client.

## 2. Add environment variables

In `.env.local`, add:

```env
ORACLE_USER=system
ORACLE_PASSWORD=your-oracle-password
ORACLE_CONNECT_STRING=localhost:1521/XEPDB1
```

Example connect strings:

- Oracle XE local PDB: `localhost:1521/XEPDB1`
- Oracle service name format: `host:1521/service_name`

## 3. Create an Oracle helper

Create `lib/oracle.ts` with this code:

```ts
import oracledb from "oracledb";

declare global {
  var _oraclePoolPromise: Promise<oracledb.Pool> | undefined;
}

function getOracleConfig() {
  const user = process.env.ORACLE_USER;
  const password = process.env.ORACLE_PASSWORD;
  const connectString = process.env.ORACLE_CONNECT_STRING;

  if (!user || !password || !connectString) {
    throw new Error(
      "ORACLE_USER, ORACLE_PASSWORD, and ORACLE_CONNECT_STRING must be configured.",
    );
  }

  return {
    user,
    password,
    connectString,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
  } satisfies oracledb.PoolAttributes;
}

export async function getOraclePool() {
  if (!global._oraclePoolPromise) {
    global._oraclePoolPromise = oracledb.createPool(getOracleConfig()).catch((error) => {
      global._oraclePoolPromise = undefined;
      throw new Error("Unable to connect to Oracle.", { cause: error });
    });
  }

  return global._oraclePoolPromise;
}

export async function withOracleConnection<T>(
  callback: (connection: oracledb.Connection) => Promise<T>,
) {
  const pool = await getOraclePool();
  const connection = await pool.getConnection();

  try {
    return await callback(connection);
  } finally {
    await connection.close();
  }
}
```

## 4. Test the connection with one route first

Before migrating the whole app, add one small test route such as `app/api/oracle-test/route.ts`:

```ts
import { NextResponse } from "next/server";
import { withOracleConnection } from "@/lib/oracle";

export async function GET() {
  try {
    const result = await withOracleConnection((connection) =>
      connection.execute(
        `SELECT 'Oracle connection is working' AS MESSAGE FROM dual`,
        [],
        { outFormat: 4002 },
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
```

Then start the app and open:

```txt
http://localhost:3000/api/oracle-test
```

## 5. Understand what must change in this project

This project does not use an ORM. The API routes call MongoDB directly, for example:

- `db.collection("patients").find({})`
- `insertOne(...)`
- `updateOne(...)`
- `deleteOne(...)`
- `new ObjectId(id)`

Oracle does not support those MongoDB APIs.

So each route has to be rewritten from MongoDB style to SQL style.

Examples:

- MongoDB `find({})` becomes `SELECT ... FROM ...`
- MongoDB `insertOne(...)` becomes `INSERT INTO ...`
- MongoDB `updateOne(...)` becomes `UPDATE ... WHERE ...`
- MongoDB `deleteOne(...)` becomes `DELETE FROM ... WHERE ...`
- MongoDB `_id/ObjectId` should become a normal Oracle key such as `NUMBER` or `VARCHAR2`

## 6. Example route conversion

Current MongoDB-style logic:

```ts
const patients = await db.collection("patients").find({}).toArray();
```

Oracle-style equivalent:

```ts
const result = await withOracleConnection((connection) =>
  connection.execute(
    `
      SELECT
        ID,
        FULL_NAME,
        DATE_OF_BIRTH,
        PHONE,
        EMAIL
      FROM PATIENTS
      ORDER BY CREATED_AT DESC
    `,
    [],
    { outFormat: 4002 },
  ),
);

const patients = (result.rows ?? []) as Array<{
  ID: number;
  FULL_NAME: string;
  DATE_OF_BIRTH: Date | null;
  PHONE: string | null;
  EMAIL: string | null;
}>;
```

## 7. Recommended migration path

The safest path is:

1. Keep MongoDB working.
2. Add Oracle connection and test route.
3. Create Oracle tables for one feature first, such as `patients`.
4. Rewrite one API route group at a time.
5. Verify each page after each route migration.
6. Remove MongoDB only after all features are moved.

## 8. Suggested first Oracle tables

Based on this app, you will likely need tables like:

- `PATIENTS`
- `APPOINTMENTS`
- `STAFF`
- `EMR_RECORDS`
- `PRESCRIPTIONS`
- `INVOICES`
- `NOTIFICATIONS`
- `SUPPORT_TICKETS`
- `SUPPORT_MESSAGES`
- `ANALYTICS_EVENTS`

## 9. Important note

If your goal is only to "connect" Oracle, the helper and test route are enough.

If your goal is to fully use Oracle instead of MongoDB, this is a database migration, not just a connection change.

import oracledb, { type Connection, type Pool, type PoolAttributes } from "oracledb";

declare global {
  var _oraclePoolPromise: Promise<Pool> | undefined;
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
  } satisfies PoolAttributes;
}

export async function getOraclePool() {
  if (!global._oraclePoolPromise) {
    global._oraclePoolPromise = oracledb
      .createPool(getOracleConfig())
      .catch((error: unknown) => {
        global._oraclePoolPromise = undefined;
        throw new Error("Unable to connect to Oracle 21c.", { cause: error });
      });
  }

  return global._oraclePoolPromise;
}

export async function withOracleConnection<T>(
  callback: (connection: Connection) => Promise<T>,
) {
  const pool = await getOraclePool();
  const connection = await pool.getConnection();

  try {
    return await callback(connection);
  } finally {
    await connection.close();
  }
}

import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoUri() {
  const uri = process.env.MONGODB_URI ?? process.env.DATABASE_URL;

  if (!uri) {
    throw new Error("MONGODB_URI or DATABASE_URL is not configured.");
  }

  return uri;
}

function getDatabaseName() {
  const explicitName = process.env.MONGODB_DB_NAME;

  if (explicitName) {
    return explicitName;
  }

  try {
    const pathname = new URL(getMongoUri()).pathname.replace(/^\//, "");

    if (pathname) {
      return pathname;
    }
  } catch {
    // Fall back to the existing default if the URI cannot be parsed.
  }

  return "dental_management_system";
}

function getClientPromise() {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(getMongoUri(), {
      appName: "dental-management-system",
      serverSelectionTimeoutMS: 10_000,
    });
    global._mongoClientPromise = client.connect().catch((error) => {
      global._mongoClientPromise = undefined;
      throw new Error("Unable to connect to MongoDB.", { cause: error });
    });
  }

  return global._mongoClientPromise;
}

export async function getDatabase() {
  const connectedClient = await getClientPromise();
  return connectedClient.db(getDatabaseName());
}

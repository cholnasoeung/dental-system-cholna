import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoUri() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  return uri;
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
  return connectedClient.db("dental_management_system");
}

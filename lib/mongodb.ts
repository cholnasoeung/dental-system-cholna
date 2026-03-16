import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

const mongoUri = uri;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise() {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(mongoUri);
    global._mongoClientPromise = client.connect();
  }

  return global._mongoClientPromise;
}

export async function getDatabase() {
  const connectedClient = await getClientPromise();
  return connectedClient.db("dental_management_system");
}

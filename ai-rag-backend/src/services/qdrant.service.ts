import crypto from "crypto";
import { QdrantClient } from "@qdrant/js-client-rest";

const qdrantUrl = process.env.QDRANT_URL;

if (!qdrantUrl) {
  throw new Error("QDRANT_URL is not defined");
}

const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

export const COLLECTION_NAME = "documents";

export async function createCollection() {
  const collections = await qdrant.getCollections();

  const exists = collections.collections.some(
    (collection) => collection.name === COLLECTION_NAME
  );

  if (exists) {
    console.log("Collection already exists");
    return;
  }

  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: 3072,
      distance: "Cosine",
    },
  });

  console.log("Collection created");
}

export async function insertDocumentChunks(
  documentId: string,
  ownerId: string,
  chunks: string[],
  embeddings: number[][]
) {
  const points = chunks.map((chunk, index) => ({
    id: crypto.randomUUID(),
    vector: embeddings[index],
    payload: {
      documentId,
      ownerId,
      chunkIndex: index,
      text: chunk,
    },
  }));

  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });

  console.log(`${points.length} chunks inserted into Qdrant`);
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  limit = 3,
  documentId?: string,
  ownerId?: string
) {
  const must: any[] = [];

  if (ownerId) {
    must.push({
      key: "ownerId",
      match: {
        value: ownerId,
      },
    });
  }

  if (documentId) {
    must.push({
      key: "documentId",
      match: {
        value: documentId,
      },
    });
  }

  const result = await qdrant.query(COLLECTION_NAME, {
    query: queryEmbedding,
    limit,
    with_payload: true,
    with_vector: false,
    filter: must.length > 0 ? { must } : undefined,
  });

  return result.points;
}

export async function deleteDocumentChunks(
  documentId: string
) {
  await qdrant.delete(COLLECTION_NAME, {
    filter: {
      must: [
        {
          key: "documentId",
          match: {
            value: documentId,
          },
        },
      ],
    },
  });

  console.log(`Deleted chunks for document: ${documentId}`);
}
export default qdrant;
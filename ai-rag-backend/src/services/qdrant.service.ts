import crypto from "crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { RAG_CONFIG } from "../config/rag.config.js";

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
    (collection) => collection.name === COLLECTION_NAME,
  );

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 3072,
        distance: "Cosine",
      },
    });

    console.log("Collection created");
  } else {
    console.log("Collection already exists");
  }

  // Create payload index for ownerId
  await qdrant.createPayloadIndex(COLLECTION_NAME, {
    field_name: "ownerId",
    field_schema: "keyword",
  });

  // Create payload index for documentId
  await qdrant.createPayloadIndex(COLLECTION_NAME, {
    field_name: "documentId",
    field_schema: "keyword",
  });

  console.log("Payload indexes ready");
}

/**
 * Deterministically generates an RFC 4122 compliant UUID v5 for a document chunk.
 * Guarantees idempotent Qdrant upserts across retries without duplicate vectors.
 */
export function generatePointId(documentId: string, chunkIndex: number): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${documentId}:${chunkIndex}`)
    .digest("hex");

  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "5" + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) +
      hash.substring(18, 20),
    hash.substring(20, 32),
  ].join("-");
}

export async function insertDocumentChunks(
  documentId: string,
  ownerId: string,
  chunks: string[],
  embeddings: number[][],
  batchSize = 100,
) {
  // Clean up any existing chunks for this document in case of retry
  await deleteDocumentChunks(documentId);

  const points = chunks.map((chunk, index) => ({
    id: generatePointId(documentId, index),
    vector: embeddings[index],
    payload: {
      documentId,
      ownerId,
      chunkIndex: index,
      text: chunk,
    },
  }));

  // Upsert in batches to avoid large payload timeouts or network limits
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: batch,
    });
  }

  console.log(`${points.length} chunks inserted into Qdrant for document ${documentId}`);
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  limit = 3,
  documentId?: string,
  ownerId?: string,
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

  return result.points.filter(
    (point) => point.score && point.score > RAG_CONFIG.similarityThreshold,
  );
}

export async function deleteDocumentChunks(documentId: string) {
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

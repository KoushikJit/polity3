import { Pinecone } from "@pinecone-database/pinecone";
import { FeatureExtractionPipeline, pipeline } from "@xenova/transformers";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Vector } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch";
import { Document } from "langchain/document";
import { chunkBatchSize, modelname, topK, nspace } from "./config";

export async function updateVectorDB(
  client: Pinecone,
  indexName: string,
  docs: Document[]
): Promise<void> {
  // Get extraction pipeline ready
  const extractor = await pipeline("feature-extraction", modelname, {
    quantized: false,
  });
  for (const doc of docs) {
    await processDocument(client, indexName, doc, extractor);
  }
}

async function processDocument(
  client: Pinecone,
  indexName: string,
  doc: Document,
  extractor: FeatureExtractionPipeline
) {
  const filename = getFilename(doc.metadata?.source);
  const docContent = doc.pageContent;
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
  });
  const documentChunks = await textSplitter.splitText(docContent);

  let chunkBatchIndex = 0;
  while (documentChunks.length > 0) {
    chunkBatchIndex++;
    console.log("documentChunks:", documentChunks.length);
    const chunkBatch = documentChunks.splice(0, chunkBatchSize);
    await processOneBatch(
      extractor,
      chunkBatch,
      chunkBatchIndex,
      filename,
      client,
      indexName
    );
  }
  console.log(
    "while loop ended with documentChunks length:",
    documentChunks.length
  );
}

async function processOneBatch(
  extractor: FeatureExtractionPipeline,
  chunkBatch: string[],
  chunkBatchIndex: number,
  filename: string,
  client: Pinecone,
  indexName: string
) {
  const output = await extractor(
    chunkBatch.map((chunk) => chunk.replace(/\n/g, " ")),
    { pooling: "cls" }
  );

  const embeddingsBatch = output.tolist();
  console.log("chunkBatch:", chunkBatch.length);
  console.log("embeddingsBatch:", embeddingsBatch.length);

  // embeddingsBatch -> vectorBatch
  let vectorBatch: Vector[] = [];
  for (let chunkIdx = 0; chunkIdx < chunkBatch.length; chunkIdx++) {
    const embedding = embeddingsBatch[chunkIdx];
    const chunk = chunkBatch[chunkIdx];

    const vector: Vector = {
      id: `${chunkIdx}_${chunkBatchIndex}_${filename}`,
      values: embedding as any,
      metadata: {
        chunk,
        filename,
      },
    };
    vectorBatch.push(vector);
  }

  const index = client.Index(indexName);
  await index.namespace(nspace).upsert(vectorBatch as any);
  console.log(`Upserted ${vectorBatch.length} vectors to namespace ${nspace}`);
  console.log("++++++++++++++++++++++++++++++++++++++++++++++++");
  vectorBatch = [];
}

export async function queryPineconeVectorStore(
  client: Pinecone,
  indexName: string,
  question: string
): Promise<string> {
  const extractor = await pipeline("feature-extraction", modelname, {
    quantized: false,
  });

  const output = await extractor(question, {
    pooling: "cls",
  });
  const queryEmbedding = Array.from(output.data);
  console.log(queryEmbedding);
  console.log("Querying database vector store...");
  const index = client.Index(indexName);
  let queryResponse = await index.namespace(nspace).query({
    topK: topK,
    vector: queryEmbedding,
    includeMetadata: true,
    includeValues: true,
  });

  if (queryResponse.matches.length > 0) {
    const concatenatedPageContent = queryResponse.matches
      .map((match) => match.metadata?.chunk)
      .join(". \n\n");
    return concatenatedPageContent;
  } else {
    return "<nomatches>";
  }
}

function getFilename(filename: string): string {
  const docname = filename.substring(filename.lastIndexOf("/") + 1);
  return docname.substring(0, docname.lastIndexOf(".")) || docname;
}

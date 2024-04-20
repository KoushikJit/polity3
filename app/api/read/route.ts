import { indexName } from "@/config";
import { queryPineconeVectorStore } from "@/utils";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";

export async function POST(req: Request, res: Response) {
  const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY ?? "",
  });
  const {question} = await req.json();
  console.log(question);
  console.log("REAd NEw");

  const concatenatedPageContent = await queryPineconeVectorStore(client, indexName, question);
  // TODO: TRY OTHER LLMs
    // const llm = new OpenAI();
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // TODO: REFINE PROMPT
    const promptString = `Use the following pieces of context to answer the question at the end. Some context might be irrelevant. If it is not possible to accurately determine the answer, then respond by saying "CANNOT_ACCURATELY_DETERMINE_THE_ANSWER".\n\nContext: ${concatenatedPageContent} \n\nQuestion: ${question} \n\nAnswer:`;
    console.log(promptString);

    const result = await model.generateContent(promptString);
    const llmRes = await result.response;
    const text = llmRes.text();
    console.log(text);
  return new Response(text, { status: 200 });
}

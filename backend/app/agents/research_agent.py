import os
from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.embeddings.chroma_client import get_document_collection
from app.embeddings.embedding_service import get_embeddings_model

class ResearchAgent:
    def __init__(self):
        self.llm = ChatGroq(
            model=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.3
        )
        self.collection = get_document_collection()
        self.embeddings = get_embeddings_model()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """
You are a Senior Financial Research Analyst.
Answer the user's question based ONLY on the provided context chunks from the financial document.
If the answer is not in the context, say "I cannot answer this based on the provided document."

When providing facts, numbers, or specific points, you MUST cite the source by referencing the [Page X] from the context metadata.

Provide your answer in clear markdown formatting.
"""),
            ("human", "Context chunks:\n{context}\n\nQuestion: {question}")
        ])

        self.chain = self.prompt | self.llm

    def answer_query(self, document_id: str, query: str) -> dict:
        # Retrieve chunks relevant to user query
        query_embeddings = self.embeddings.embed_documents([query])
        
        results = self.collection.query(
            query_embeddings=query_embeddings,
            where={"document_id": document_id},
            n_results=5
        )
        
        if not results["documents"] or not results["documents"][0]:
            logger.warning(f"No chunks found for document {document_id}")
            return {"answer": "No relevant information found in the document.", "citations": []}
            
        context_parts = []
        citations = []
        for i, text in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i]
            chunk_id = results["ids"][0][i]
            page = meta.get("page_number", 0)
            context_parts.append(f"--- [Page {page}] ---\n{text}")
            citations.append({"page": page, "chunk_id": chunk_id, "text": text[:200] + "..."})
            
        context = "\n\n".join(context_parts)
        
        try:
            response = self.chain.invoke({"context": context, "question": query})
            output = response.content.strip()
            
            return {
                "answer": output,
                "citations": citations
            }
            
        except Exception as e:
            logger.error(f"ResearchAgent failed for {document_id}: {e}")
            return {"answer": "An error occurred while generating the response.", "citations": []}

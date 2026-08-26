from pypdf import PdfReader
from loguru import logger
import uuid
from langchain_text_splitters import RecursiveCharacterTextSplitter
from ..embeddings.embedding_service import get_embeddings_model
from ..llm.model_router import LLMRouter

class DocumentAgent:
    def __init__(self):
        self.chunker = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", ".", " ", ""]
        )

    def process_and_index(self, file_path: str, workspace_id: str, document_id: str, file_name: str) -> dict:
        """
        Extracts text from PDF, chunks it, generates embeddings, and stores in ChromaDB.
        Returns processing stats.
        """
        try:
            reader = PdfReader(file_path)
            chunks = []
            metadata_list = []
            ids = []
            
            chunk_index = 0
            for page_num, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted and extracted.strip():
                    page_chunks = self.chunker.split_text(extracted)
                    for i, text in enumerate(page_chunks):
                        chunks.append(text)
                        
                        meta = {
                            "workspace_id": workspace_id,
                            "document_id": document_id,
                            "file_name": file_name,
                            "page_number": page_num + 1,
                            "chunk_index": chunk_index,
                            "source": file_name,
                            "section": "unknown"
                        }
                        metadata_list.append(meta)
                        ids.append(f"{document_id}_{chunk_index}")
                        chunk_index += 1
            
            if not chunks:
                logger.error(f"No text extracted from {file_name}")
                raise ValueError(f"No parseable text could be extracted from the document: {file_name}. Ensure it is a valid text-based PDF.")

            from ..embeddings.embedding_router import embedding_router
            from ..embeddings.chroma_client import get_collection_for_provider, chroma_lock
            from typing import Any, cast
            
            # Generate embeddings via the resilient router
            embeddings_list, provider, model_name, dimension = embedding_router.embed_documents(chunks)
            
            # Add embedding metadata to all chunks
            for meta in metadata_list:
                meta["embedding_provider"] = provider
                meta["embedding_model"] = model_name
                meta["embedding_dimension"] = dimension
            
            collection = get_collection_for_provider(provider, model_name)
            
            with chroma_lock:
                collection.upsert(
                    ids=ids,
                    documents=chunks,
                    metadatas=cast(Any, metadata_list),
                    embeddings=cast(Any, embeddings_list)
                )
            
            logger.info(f"Indexed {len(chunks)} chunks for document {document_id} using {provider} ({model_name})")
            return {"chunks": len(chunks)}
            
        except Exception as e:
            logger.error(f"Failed to process {file_path}: {e}")
            raise e

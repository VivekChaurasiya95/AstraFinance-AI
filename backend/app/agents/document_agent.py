from pypdf import PdfReader
from loguru import logger
import uuid
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.embeddings.embedding_service import get_embeddings_model

class DocumentAgent:
    def __init__(self):
        self.chunker = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        try:
            from app.embeddings.chroma_client import get_document_collection
            self.collection = get_document_collection()
        except Exception as e:
            logger.error(f"ChromaDB collection unavailable: {e}")
            self.collection = None
        self.embeddings = get_embeddings_model()

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
                if extracted:
                    page_chunks = self.chunker.split_text(extracted)
                    for i, text in enumerate(page_chunks):
                        chunks.append(text)
                        
                        meta = {
                            "workspace_id": workspace_id,
                            "document_id": document_id,
                            "file_name": file_name,
                            "page_number": page_num + 1,
                            "chunk_index": chunk_index
                        }
                        metadata_list.append(meta)
                        ids.append(f"{document_id}_{chunk_index}")
                        chunk_index += 1
            
            if not chunks:
                logger.warning(f"No text extracted from {file_name}")
                return {"chunks": 0}

            import time
            # Embed and insert into ChromaDB
            # Process in smaller batches with delays to respect Gemini free tier limits (15 RPM)
            batch_size = 20
            embeddings_list = []
            
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i + batch_size]
                
                # Retry logic for 429 Resource Exhausted
                max_retries = 5
                for attempt in range(max_retries):
                    try:
                        batch_embeddings = self.embeddings.embed_documents(batch_chunks)
                        embeddings_list.extend(batch_embeddings)
                        break
                    except Exception as e:
                        if "429" in str(e) and attempt < max_retries - 1:
                            logger.warning(f"Rate limit hit during embedding. Sleeping for 25s... (Attempt {attempt+1}/{max_retries})")
                            time.sleep(25)
                        else:
                            raise e
                
                # Sleep between batches to avoid hitting the RPM limit
                if i + batch_size < len(chunks):
                    time.sleep(2)
            
            self.collection.add(
                ids=ids,
                documents=chunks,
                metadatas=metadata_list,
                embeddings=embeddings_list
            )
            
            logger.info(f"Indexed {len(chunks)} chunks for document {document_id}")
            return {"chunks": len(chunks)}
            
        except Exception as e:
            logger.error(f"Failed to process {file_path}: {e}")
            raise e


from pathlib import Path
from langchain_text_splitters import RecursiveCharacterTextSplitter


class DocumentChunker:
 

    def __init__(self, chunk_size=1000, chunk_overlap=200):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=[
                "\n\n",
                "\n",
                ". ",
                " ",
                ""
            ]
        )

    def chunk_text(self, text: str):
       
        return self.splitter.split_text(text)

    def chunk_file(self, file_path: str):
       
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"{file_path} not found.")

        text = path.read_text(encoding="utf-8")

        return self.chunk_text(text)


if __name__ == "__main__":

    print("=" * 60)
    print("ASTRAFINANCE DOCUMENT CHUNKER")
    print("=" * 60)

    sample_text = """
    Artificial Intelligence is transforming financial analysis.

    Large Language Models can analyze annual reports,
    extract financial metrics, detect anomalies,
    compare companies, and generate insights.

    Retrieval-Augmented Generation (RAG)
    allows LLMs to answer questions using
    company documents.

    Chunking is an important preprocessing step
    before generating embeddings.
    """ * 30

    chunker = DocumentChunker()

    chunks = chunker.chunk_text(sample_text)

    print(f"\nTotal Chunks Created: {len(chunks)}\n")

    for index, chunk in enumerate(chunks, start=1):
        print("-" * 60)
        print(f"Chunk {index}")
        print("-" * 60)
        print(chunk)
        print()
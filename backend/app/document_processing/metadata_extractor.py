
from pathlib import Path
from datetime import datetime
import fitz


class MetadataExtractor:
    """
    Extract metadata from PDF documents.
    """

    def __init__(self):
        pass

    def extract_metadata(self, pdf_path: str) -> dict:
        """
        Extract metadata from a PDF file.

        Args:
            pdf_path (str): Path to the PDF file.

        Returns:
            dict: Metadata dictionary.
        """

        pdf_file = Path(pdf_path)

        if not pdf_file.exists():
            raise FileNotFoundError(f"PDF not found:\n{pdf_file}")

        document = fitz.open(str(pdf_file))

        pdf_metadata = document.metadata or {}

        metadata = {
            "file_name": pdf_file.name,
            "file_path": str(pdf_file.resolve()),
            "file_size_kb": round(pdf_file.stat().st_size / 1024, 2),
            "page_count": document.page_count,
            "title": pdf_metadata.get("title", ""),
            "author": pdf_metadata.get("author", ""),
            "subject": pdf_metadata.get("subject", ""),
            "keywords": pdf_metadata.get("keywords", ""),
            "creator": pdf_metadata.get("creator", ""),
            "producer": pdf_metadata.get("producer", ""),
            "creation_date": pdf_metadata.get("creationDate", ""),
            "modification_date": pdf_metadata.get("modDate", ""),
            "processed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        document.close()

        return metadata


def main():
    """
    Test Metadata Extractor
    """

    # backend folder
    backend_dir = Path(__file__).resolve().parents[2]

    # backend/sample_docs/sample.pdf
    pdf_path = backend_dir / "sample_docs" / "sample.pdf"

    print("=" * 60)
    print("ASTRAFINANCE DOCUMENT METADATA EXTRACTOR")
    print("=" * 60)
    print()

    print("Looking for PDF:")
    print(pdf_path)
    print()

    if not pdf_path.exists():
        print("ERROR: PDF file not found.")
        print()
        print("Expected location:")
        print(pdf_path)
        return

    extractor = MetadataExtractor()

    try:

        metadata = extractor.extract_metadata(str(pdf_path))

        print("DOCUMENT METADATA")
        print("-" * 60)

        for key, value in metadata.items():
            print(f"{key:<20}: {value}")

        print("-" * 60)
        print("Metadata extraction completed successfully.")

    except Exception as e:
        print(f"\nERROR: {e}")


if __name__ == "__main__":
    main()
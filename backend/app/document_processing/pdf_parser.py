"""
pdf_parser.py

This module is responsible for reading PDF documents
and extracting text from each page using PyMuPDF.
"""

import fitz  # PyMuPDF
from pathlib import Path


class PDFParser:
    """Handles PDF parsing and text extraction."""

    def __init__(self):
        pass

    def parse_pdf(self, file_path: str):
        """
        Extract text from every page of a PDF.

        Args:
            file_path (str): Path to the PDF file.

        Returns:
            list: List of dictionaries containing page number and page text.

            Example:
            [
                {
                    "page": 1,
                    "text": "Revenue increased by 12%..."
                },
                {
                    "page": 2,
                    "text": "Operating income improved..."
                }
            ]
        """

        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"PDF not found: {file_path}")

        extracted_pages = []

        try:
            document = fitz.open(file_path)

            for page_number, page in enumerate(document, start=1):

                text = page.get_text("text")

                extracted_pages.append(
                    {
                        "page": page_number,
                        "text": text.strip()
                    }
                )

            document.close()

            return extracted_pages

        except Exception as e:
            raise Exception(f"Error while parsing PDF: {e}")


# --------------------------
# Example Usage
# --------------------------

if __name__ == "__main__":

    parser = PDFParser()

    pdf_path = "sample.pdf"

    try:
        pages = parser.parse_pdf(pdf_path)

        for page in pages:
            print(f"\nPage {page['page']}")
            print("-" * 50)
            print(page["text"][:500])

    except Exception as error:
        print(error)
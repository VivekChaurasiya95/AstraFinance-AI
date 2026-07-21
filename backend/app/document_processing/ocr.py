

from pathlib import Path

import pytesseract
from pdf2image import convert_from_path


class OCRExtractor:
   
    def __init__(self, poppler_path: str = None, tesseract_cmd: str = None):
        self.poppler_path = poppler_path

        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    def extract_text(self, pdf_path: str) -> str:
        """
        Extract text from a scanned PDF using OCR.

        Args:
            pdf_path (str): Path to the PDF.

        Returns:
            str: Extracted text.
        """

        pdf_file = Path(pdf_path)

        if not pdf_file.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        pages = convert_from_path(
            pdf_path,
            poppler_path=self.poppler_path
        )

        extracted_text = []

        for page_number, image in enumerate(pages, start=1):

            print(f"Processing page {page_number}/{len(pages)}...")

            page_text = pytesseract.image_to_string(image)

            extracted_text.append(page_text)

        return "\n".join(extracted_text)


def main():

    pdf_path = Path(__file__).resolve().parents[2] / "sample_docs" / "sample.pdf"

    poppler_path = (
        r"C:\Users\Asus\Downloads\Release-26.02.0-0 (1)"
        r"\poppler-26.02.0\Library\bin"
    )

    tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    extractor = OCRExtractor(
        poppler_path=poppler_path,
        tesseract_cmd=tesseract_cmd
    )

    try:

        print("=" * 60)
        print("ASTRAFINANCE OCR EXTRACTOR")
        print("=" * 60)

        print(f"\nReading:\n{pdf_path}\n")

        text = extractor.extract_text(str(pdf_path))

        print("\n" + "=" * 60)
        print("OCR COMPLETED")
        print("=" * 60)

        print(f"\nTotal Characters Extracted: {len(text)}")

        print("\nFirst 1000 Characters:\n")
        print(text[:1000])

    except Exception as e:
        print(f"\nERROR: {e}")


if __name__ == "__main__":
    main()
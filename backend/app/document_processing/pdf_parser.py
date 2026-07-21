import fitz


class PDFParser:
   
    def __init__(self):
        pass

    def extract_text(self, pdf_path: str):
     
        pages_data = []

        try:
            document = fitz.open(pdf_path)

            for page_number in range(document.page_count):

                page = document.load_page(page_number)

                pages_data.append(
                    {
                        "page": page_number + 1,
                        "text": page.get_text(),
                    }
                )

            document.close()

        except Exception as e:
            print(f"Error reading PDF: {e}")

        return pages_data


def main():

    from pathlib import Path

    pdf_path = (
        Path(__file__).resolve().parents[2]
        / "sample_docs"
        / "sample.pdf"
    )

    print("=" * 60)
    print("ASTRAFINANCE PDF PARSER")
    print("=" * 60)

    parser = PDFParser()

    pages = parser.extract_text(str(pdf_path))

    print(f"\nTotal Pages: {len(pages)}")

    if pages:
        print("\nFirst Page Preview:\n")
        print(pages[0]["text"][:1000])


if __name__ == "__main__":
    main()
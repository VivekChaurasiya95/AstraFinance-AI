

from pathlib import Path
import pdfplumber


class TableExtractor:
   
    def extract_tables(self, pdf_path: str):
      

        pdf_path = Path(pdf_path)

        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        extracted_tables = []

        with pdfplumber.open(pdf_path) as pdf:

            for page_number, page in enumerate(pdf.pages, start=1):

                print(f"Processing page {page_number}/{len(pdf.pages)}...")

                tables = page.extract_tables()

                if not tables:
                    continue

                for table_index, table in enumerate(tables, start=1):

                    extracted_tables.append(
                        {
                            "page": page_number,
                            "table_number": table_index,
                            "rows": table,
                        }
                    )

        return extracted_tables


def print_tables(tables):
   

    if not tables:
        print("\nNo tables found.")
        return

    print("\n" + "=" * 60)
    print("EXTRACTED TABLES")
    print("=" * 60)

    for table in tables:

        print(f"\nPage {table['page']} | Table {table['table_number']}")
        print("-" * 60)

        for row in table["rows"]:
            row = [cell if cell is not None else "" for cell in row]
            print(" | ".join(row))


def main():

    pdf_path = (
        Path(__file__).resolve().parents[2]
        / "sample_docs"
        / "sample.pdf"
    )

    print("=" * 60)
    print("ASTRAFINANCE TABLE EXTRACTOR")
    print("=" * 60)

    print(f"\nReading:\n{pdf_path}\n")

    extractor = TableExtractor()

    tables = extractor.extract_tables(str(pdf_path))

    print(f"\nTotal Tables Found: {len(tables)}")

    print_tables(tables)


if __name__ == "__main__":
    main()
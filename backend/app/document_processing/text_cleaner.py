
import re


class TextCleaner:
    
    @staticmethod
    def clean_text(text: str) -> str:
        if not text:
            return ""
        text = text.replace("\t", " ")
        text = re.sub(r" +", " ", text)
        text = re.sub(r"\n\s*\n+", "\n\n", text)
        text = text.strip()
        return text
if __name__ == "__main__":
    sample_text =
    cleaned = TextCleaner.clean_text(sample_text)
    print(cleaned)
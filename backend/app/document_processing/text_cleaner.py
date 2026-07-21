import re


def clean_text(text):
    if not text:
        return ""

    text = re.sub(r"[ \t]+", " ", text)

  
    text = re.sub(r"\n+", "\n", text)

  
    text = text.strip()

    return text






    
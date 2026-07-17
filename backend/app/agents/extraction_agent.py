import os
import json

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()


class ExtractionAgent:

    def __init__(self):

        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0
        )

        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """
You are an expert Financial Extraction Agent.

Extract the following information from the financial document.

Return ONLY valid JSON.

{{
    "company_name": "",
    "revenue": "",
    "expenses": "",
    "net_profit": "",
    "assets": "",
    "liabilities": "",
    "financial_ratios": {{
        "current_ratio": "",
        "debt_to_equity_ratio": ""
    }}
}}

If any field is missing, return an empty string.
Do not return markdown.
Do not return explanations.
Return JSON only.
"""
                ),
                (
                    "human",
                    "{document}"
                )
            ]
        )

        self.chain = self.prompt | self.llm

    def extract(self, document_text):

        response = self.chain.invoke(
            {
                "document": document_text
            }
        )

        output = response.content.strip()

        if output.startswith("```json"):
            output = output.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(output)

        except Exception:

            return {
                "company_name": "",
                "revenue": "",
                "expenses": "",
                "net_profit": "",
                "assets": "",
                "liabilities": "",
                "financial_ratios": {
                    "current_ratio": "",
                    "debt_to_equity_ratio": ""
                },
                "raw_response": output
            }


if __name__ == "__main__":

    sample_text = """
    ABC Pvt Ltd Annual Financial Report 2025

    Revenue : 1200000
    Expenses : 800000
    Net Profit : 400000
    Assets : 3500000
    Liabilities : 1800000

    Current Ratio : 1.8
    Debt to Equity Ratio : 1.4
    """

    agent = ExtractionAgent()

    result = agent.extract(sample_text)

    print(json.dumps(result, indent=4))
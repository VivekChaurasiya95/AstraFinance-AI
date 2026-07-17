import os
import json

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()


class RedFlagAgent:

    def __init__(self):

        self.llm = ChatGroq(
            model=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0
        )

        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """
You are an expert Financial Risk Analysis Agent.

Analyze the financial data and identify financial risks.

Return ONLY valid JSON.

{{
    "risk_level": "",
    "red_flags": [],
    "recommendations": []
}}

Rules:
- Risk level must be Low, Medium or High.
- red_flags must be a JSON array.
- recommendations must be a JSON array.
- Do not return markdown.
- Do not return explanations.
- Return only JSON.
"""
                ),
                (
                    "human",
                    "{financial_data}"
                )
            ]
        )

        self.chain = self.prompt | self.llm

    def analyze(self, financial_data):

        response = self.chain.invoke(
            {
                "financial_data": json.dumps(financial_data, indent=2)
            }
        )

        output = response.content.strip()

        if output.startswith("```json"):
            output = output.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(output)

        except Exception:

            return {
                "risk_level": "Unknown",
                "red_flags": [],
                "recommendations": [],
                "raw_response": output
            }


if __name__ == "__main__":

    sample_data = {
        "company_name": "ABC Pvt Ltd",
        "revenue": "1200000",
        "expenses": "800000",
        "net_profit": "400000",
        "assets": "3500000",
        "liabilities": "1800000",
        "financial_ratios": {
            "current_ratio": "1.8",
            "debt_to_equity_ratio": "1.4"
        }
    }

    agent = RedFlagAgent()

    result = agent.analyze(sample_data)

    print(json.dumps(result, indent=4))
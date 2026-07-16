import json
from groq import Groq
from app.config.groq_config import GROQ_API_KEY


class RedFlagAgent:

    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)

    def analyze_financial_risk(self, financial_data):

        prompt = f"""
Analyze the following financial data.

Return ONLY JSON.

Financial Data:

{json.dumps(financial_data, indent=4)}
"""

        response = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        result = response.choices[0].message.content.strip()

        if result.startswith("```json"):
            result = result.replace("```json", "").replace("```", "").strip()

        return json.loads(result)
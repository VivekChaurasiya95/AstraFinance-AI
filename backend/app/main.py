from fastapi import FastAPI
from app.agents.extraction_agent import ExtractionAgent
from app.agents.red_flag_agent import RedFlagAgent

app = FastAPI()

extractor = ExtractionAgent()
red_flag = RedFlagAgent()


@app.get("/")
def home():
    return {"message": "FastAPI is running!"}


@app.get("/test")
def test_agents():

    sample_text = """
    ABC Pvt Ltd Financial Report 2025

    Revenue: 1200000
    Expenses: 800000
    Net Profit: 400000
    Assets: 3500000
    Liabilities: 1800000
    Current Ratio: 1.8
    Debt to Equity Ratio: 1.4
    """

    extracted_data = extractor.extract(sample_text)

    risk_analysis = red_flag.analyze(extracted_data)

    return {
        "extracted_data": extracted_data,
        "risk_analysis": risk_analysis
    }
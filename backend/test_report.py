import asyncio
from app.agents.report_agent import report_agent
from dotenv import load_dotenv

load_dotenv()

async def run_test():
    workspace_name = "Test Workspace"
    documents = [{"name": "Test Company 2024 Annual Report.pdf"}]
    sections = [
        {"id": "exec_summary", "label": "Executive Summary", "enabled": True},
        {"id": "financial_overview", "label": "Financial Overview", "enabled": True},
        {"id": "risk_analysis", "label": "Risk Analysis", "enabled": True},
        {"id": "ai_insights", "label": "AI Insights", "enabled": True}
    ]
    
    metrics_data = [
        {
            "key_metrics": [
                {"name": "Revenue", "value": "$100M"},
                {"name": "Net Profit", "value": "$15M"}
            ],
            "trends": [
                {"name": "Revenue Growth", "value": "10% YoY"}
            ]
        }
    ]
    
    red_flags_data = [
        {
            "title": "High Debt to Equity",
            "severity": "High",
            "description": "The company has taken on significant new debt this quarter."
        }
    ]

    print("Generating report...")
    pdf_path = report_agent.generate_report(
        workspace_name=workspace_name,
        documents=documents,
        sections=sections,
        metrics_data=metrics_data,
        red_flags_data=red_flags_data
    )
    print(f"Report successfully generated at: {pdf_path}")

if __name__ == "__main__":
    asyncio.run(run_test())

import asyncio
from app.agents.report_agent import report_agent # type: ignore

def test_pdf():
    try:
        pdf_path = report_agent.generate_report(
            workspace_name="Test Workspace",
            documents=[{"name": "test_doc.pdf"}],
            sections=[{"id": "exec_summary", "label": "Executive Summary"}],
            metrics_data=[],
            red_flags_data=[]
        )
        print(f"Success! PDF generated at: {pdf_path}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf()

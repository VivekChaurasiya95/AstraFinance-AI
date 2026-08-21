import os
import json
from fpdf import FPDF
from datetime import datetime
from uuid import uuid4
from loguru import logger
from langchain_core.messages import SystemMessage, HumanMessage

from ..llm.model_router import get_llm_router
from ..schemas.report_schema import ReportOutput
from ..utils.pdf_renderer import build_premium_pdf

class ReportAgent:
    def __init__(self, output_dir: str = "reports_output"):
        self.output_dir = output_dir
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        self.router = get_llm_router()

    def generate_report(self, workspace_name: str, documents: list, sections: list, metrics_data: list, red_flags_data: list, comparison_data: list | None = None, research_data: list | None = None, user_settings: dict | None = None) -> str:
        logger.info(f"ReportAgent: Compiling report for workspace '{workspace_name}'...")
        
        # 1. Build Context
        context_parts = []
        
        context_parts.append(f"Workspace Name: {workspace_name}\n")
        
        if documents:
            context_parts.append("### Documents Included ###")
            for doc in documents:
                context_parts.append(f"- {doc.get('name', doc.get('filename', 'Unknown Document'))}")
            context_parts.append("")
            
        if metrics_data:
            context_parts.append("### Extracted Financial Metrics ###")
            for m in metrics_data:
                context_parts.append(json.dumps(m.get("key_metrics", []), indent=2))
                context_parts.append(json.dumps(m.get("trends", []), indent=2))
            context_parts.append("")
            
        if red_flags_data:
            context_parts.append("### Detected Risk Indicators (Red Flags) ###")
            for rf in red_flags_data:
                context_parts.append(f"Risk: {rf.get('title', 'N/A')}")
                context_parts.append(f"Severity: {rf.get('severity', 'N/A')}")
                context_parts.append(f"Description: {rf.get('description', 'N/A')}\n")
            context_parts.append("")
            
        if comparison_data:
            context_parts.append("### Comparative Analysis Data ###")
            for comp in comparison_data:
                context_parts.append(json.dumps(comp.get("comparison", {}), indent=2))
            context_parts.append("")
            
        if research_data:
            context_parts.append("### Relevant Research Data ###")
            for r in research_data:
                context_parts.append(f"Topic: {r.get('topic', 'N/A')}")
                context_parts.append(f"Findings: {r.get('findings', 'N/A')}\n")
            context_parts.append("")

        context_str = "\n".join(context_parts)
        
        system_prompt = (
            "You are an expert Financial Analyst and Report Generator for AstraFinance AI.\n"
            "Your task is to synthesize the provided raw data (metrics, risks, comparisons) into a professional, cohesive financial report.\n"
            "Do NOT hallucinate or make up financial numbers. Only use the data provided in the context.\n"
            "Write in a highly professional, objective, and analytical tone.\n"
            "Ensure the output conforms exactly to the required structured schema."
        )
        
        human_prompt = f"Please generate a comprehensive financial report based on the following raw data:\n\n{context_str}"

        # 2. Call LLM Router
        logger.info("ReportAgent: Calling LLM to synthesize report content...")
        try:
            report_data: ReportOutput = self.router.invoke_structured( # type: ignore
                agent_name="report",
                messages=[
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=human_prompt)
                ],
                schema=ReportOutput,
                user_settings=user_settings
            )
            logger.info("ReportAgent: Successfully generated structured report from LLM.")
        except Exception as e:
            logger.error(f"ReportAgent: LLM synthesis failed. Error: {str(e)}")
            raise RuntimeError(f"Failed to synthesize report via LLM: {str(e)}")

        # 3. Generate PDF
        logger.info("ReportAgent: Rendering Premium PDF...")
        return build_premium_pdf(
            workspace_name=workspace_name,
            documents=documents,
            sections=sections,
            data=report_data,
            metrics_data=metrics_data,
            red_flags_data=red_flags_data,
            comparison_data=comparison_data,
            output_dir=self.output_dir
        )
        
    def _sanitize_text(self, text: str) -> str:
        if not text: return ""
        text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'").replace('\u2013', '-').replace('\u2014', '-')
        text = text.encode('latin-1', 'replace').decode('latin-1')
        words = text.split(' ')
        wrapped = []
        for w in words:
            if len(w) > 30:
                w = '-'.join(w[i:i+30] for i in range(0, len(w), 30))
            wrapped.append(w)
        return ' '.join(wrapped)

        return ' '.join(wrapped)

report_agent = ReportAgent()

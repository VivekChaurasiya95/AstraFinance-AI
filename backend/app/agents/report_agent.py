import os
import json
from fpdf import FPDF
from datetime import datetime
from uuid import uuid4
from loguru import logger
from langchain_core.messages import SystemMessage, HumanMessage

from ..llm.model_router import get_llm_router
from ..schemas.report_schema import ReportOutput

class ReportAgent:
    def __init__(self, output_dir: str = "reports_output"):
        self.output_dir = output_dir
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        self.router = get_llm_router()

    def generate_report(self, workspace_name: str, documents: list, sections: list, metrics_data: list, red_flags_data: list, comparison_data: list | None = None, research_data: list | None = None, user_settings: dict = None) -> str:
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
        logger.info("ReportAgent: Rendering PDF...")
        return self._render_pdf(workspace_name, documents, sections, report_data)
        
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

    def _render_pdf(self, workspace_name: str, documents: list, sections: list, data: ReportOutput) -> str:
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        workspace_name = self._sanitize_text(workspace_name)
        
        # --- Title Page ---
        pdf.add_page()
        pdf.set_font("helvetica", "B", 24)
        pdf.cell(0, 20, "AstraFinance AI Report", ln=True, align="C")
        pdf.set_font("helvetica", "I", 14)
        pdf.cell(0, 10, f"Workspace: {workspace_name}", ln=True, align="C")
        pdf.set_font("helvetica", "", 12)
        pdf.cell(0, 10, f"Generated on: {datetime.now().strftime('%B %d, %Y')}", ln=True, align="C")
        pdf.ln(20)

        # Included Documents
        pdf.set_font("helvetica", "B", 16)
        pdf.cell(0, 10, "Included Documents", ln=True)
        pdf.set_font("helvetica", "", 12)
        for doc in documents:
            pdf.cell(0, 10, f"- {self._sanitize_text(doc.get('name', doc.get('filename', 'Unknown')))}", ln=True)
        pdf.ln(10)
        
        # We will iterate through the user-requested sections
        requested_ids = {s.get("id") for s in sections if s.get("enabled", True)}
        
        # Fallback dictionary mapping section IDs to generated content
        content_map = {
            "exec_summary": ("Executive Summary", [data.executive_summary]),
            "financial_overview": ("Financial Overview", data.financial_overview),
            "financial_performance": ("Financial Performance & Trends", data.financial_performance),
            "risk_analysis": ("Risk Analysis (Red Flags)", data.risk_analysis),
            "comparative_analysis": ("Comparative Analysis", data.comparative_analysis),
            "ai_insights": ("AI Insights & Commentary", [data.ai_insights]),
            "conclusion": ("Conclusion", [data.conclusion])
        }

        for sec_id, (default_title, sec_content) in content_map.items():
            if sec_id not in requested_ids:
                continue
                
            pdf.add_page()
            pdf.set_font("helvetica", "B", 18)
            pdf.cell(0, 15, default_title, ln=True)
            pdf.ln(5)
            
            pdf.set_font("helvetica", "", 12)
            
            if isinstance(sec_content, list) and len(sec_content) > 0 and not isinstance(sec_content[0], str) and hasattr(sec_content[0], "title"):
                # It's a list of ReportSection
                for sub in sec_content:
                    title_text = getattr(sub, "title", "")
                    content_text = getattr(sub, "content", "")
                    pdf.set_font("helvetica", "B", 14)
                    pdf.cell(0, 10, self._sanitize_text(title_text), ln=True)
                    pdf.set_font("helvetica", "", 12)
                    pdf.multi_cell(0, 7, self._sanitize_text(content_text))
                    pdf.ln(5)
            else:
                # It's a string (or list of strings)
                for paragraph in sec_content:
                    pdf.multi_cell(0, 7, self._sanitize_text(str(paragraph)))
                    pdf.ln(5)
                    
        # Save PDF
        file_name = f"report_{uuid4().hex}.pdf"
        file_path = os.path.join(self.output_dir, file_name)
        pdf.output(file_path)
        
        return file_path

report_agent = ReportAgent()

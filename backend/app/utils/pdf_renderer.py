import os
import io
from datetime import datetime
from uuid import uuid4
from fpdf import FPDF
import matplotlib
import matplotlib.pyplot as plt

# Use non-interactive backend for matplotlib
matplotlib.use('Agg')

# Colors
BRAND_TEAL = (13, 148, 136)      # #0d9488
DARK_NAVY = (15, 23, 42)         # #0f172a
SUCCESS_GREEN = (16, 185, 129)   # #10b981
WARNING_AMBER = (245, 158, 11)   # #f59e0b
RISK_RED = (239, 68, 68)         # #ef4444
SURFACE_LIGHT = (248, 250, 252)  # #f8fafc
TEXT_GRAY = (100, 116, 139)      # #64748b

class PremiumPDF(FPDF):
    def __init__(self, workspace_name=""):
        super().__init__()
        self.workspace_name = workspace_name
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(left=20, top=20, right=20)

    def header(self):
        if self.page_no() == 1:
            return  # No header on cover page
            
        self.set_font('helvetica', 'B', 10)
        self.set_text_color(*BRAND_TEAL)
        self.cell(0, 10, "ASTRAFINANCE AI", ln=False, align='L')
        self.set_font('helvetica', 'I', 10)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, "Financial Intelligence Report", ln=True, align='R')
        
        # Subtle accent line
        self.set_draw_color(*BRAND_TEAL)
        self.set_line_width(0.5)
        self.line(20, 28, 190, 28)
        self.ln(10)

    def footer(self):
        if self.page_no() == 1:
            return
            
        self.set_y(-20)
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.2)
        self.line(20, self.get_y(), 190, self.get_y())
        
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, "AstraFinance AI | Confidential - For Analytical Purposes", ln=False, align='L')
        
        self.set_font('helvetica', 'B', 8)
        self.set_text_color(*DARK_NAVY)
        self.cell(0, 10, f"Page {self.page_no()}", ln=False, align='R')

    def draw_border(self):
        if self.page_no() == 1:
            # Thick cover border
            self.set_draw_color(*BRAND_TEAL)
            self.set_line_width(1.5)
            self.rect(10, 10, 190, 277)
        else:
            # Subtle page border
            self.set_draw_color(230, 230, 230)
            self.set_line_width(0.5)
            self.rect(10, 10, 190, 277)

def sanitize_text(text: str) -> str:
    if not text: return ""
    text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'").replace('\u2013', '-').replace('\u2014', '-')
    text = text.encode('latin-1', 'replace').decode('latin-1')
    return text

class ChartRenderer:
    @staticmethod
    def render_revenue_chart(metrics_data, output_path):
        # Extract revenue history if possible
        # This is a generic mockup logic based on metrics_data.
        # Since we don't know the exact structure, we try to safely parse it.
        try:
            years = []
            revenues = []
            for doc_metrics in metrics_data:
                trends = doc_metrics.get("trends", [])
                for t in trends:
                    if "revenue" in str(t).lower():
                        # attempt to parse years and values
                        pass
            
            # If we couldn't parse real data, return None to avoid fake data
            if not years:
                return None
                
            plt.figure(figsize=(8, 4))
            plt.bar(years, revenues, color='#0d9488')
            plt.title('Revenue Trend', fontsize=14, color='#0f172a', pad=20)
            plt.box(False)
            plt.grid(axis='y', alpha=0.2)
            plt.savefig(output_path, bbox_inches='tight', dpi=300)
            plt.close()
            return output_path
        except:
            return None

def build_premium_pdf(workspace_name: str, documents: list, sections: list, data, metrics_data: list, red_flags_data: list, comparison_data: list, output_dir: str) -> str:
    pdf = PremiumPDF(workspace_name=sanitize_text(workspace_name))
    
    # --- COVER PAGE ---
    pdf.add_page()
    pdf.draw_border()
    pdf.set_y(80)
    
    pdf.set_font("helvetica", "B", 36)
    pdf.set_text_color(*DARK_NAVY)
    pdf.cell(0, 15, "FINANCIAL", ln=True, align="C")
    pdf.cell(0, 15, "INTELLIGENCE REPORT", ln=True, align="C")
    
    pdf.ln(10)
    pdf.set_font("helvetica", "I", 14)
    pdf.set_text_color(*BRAND_TEAL)
    pdf.cell(0, 10, f"Workspace: {sanitize_text(workspace_name)}", ln=True, align="C")
    
    pdf.set_y(220)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(*TEXT_GRAY)
    
    pdf.cell(0, 6, "Prepared by AstraFinance AI", ln=True, align="C")
    pdf.cell(0, 6, "AI-Powered Financial Research & Intelligence", ln=True, align="C")
    pdf.cell(0, 6, f"Generated on: {datetime.now().strftime('%B %d, %Y')}", ln=True, align="C")
    pdf.cell(0, 6, f"Documents Analyzed: {len(documents)}", ln=True, align="C")

    # Determine requested sections
    requested_ids = {s.get("id") for s in sections if s.get("enabled", True)}

    # Helper to render section title
    def render_section_title(title):
        pdf.add_page()
        pdf.draw_border()
        pdf.set_font("helvetica", "B", 24)
        pdf.set_text_color(*DARK_NAVY)
        pdf.cell(0, 15, title, ln=True)
        pdf.set_draw_color(*BRAND_TEAL)
        pdf.set_line_width(1)
        pdf.line(20, pdf.get_y(), 40, pdf.get_y())
        pdf.ln(10)

    # --- EXECUTIVE SUMMARY ---
    if "exec_summary" in requested_ids:
        render_section_title("Executive Summary")
        
        # KPI Cards (if metrics exist, otherwise just use the text)
        has_metrics = bool(metrics_data)
        if has_metrics:
            pdf.set_fill_color(*SURFACE_LIGHT)
            pdf.set_draw_color(220, 220, 220)
            
            # Simple 2-column KPI mock
            x_start = 20
            y_start = pdf.get_y()
            
            # Box 1
            pdf.rect(x_start, y_start, 80, 25, style='DF')
            pdf.set_font("helvetica", "B", 10)
            pdf.set_text_color(*TEXT_GRAY)
            pdf.set_xy(x_start + 5, y_start + 5)
            pdf.cell(70, 5, "ENTITIES ANALYZED", ln=True)
            pdf.set_font("helvetica", "B", 14)
            pdf.set_text_color(*DARK_NAVY)
            pdf.set_xy(x_start + 5, y_start + 12)
            pdf.cell(70, 10, str(len(documents)), ln=True)
            
            # Box 2
            x_start += 90
            pdf.rect(x_start, y_start, 80, 25, style='DF')
            pdf.set_font("helvetica", "B", 10)
            pdf.set_text_color(*TEXT_GRAY)
            pdf.set_xy(x_start + 5, y_start + 5)
            pdf.cell(70, 5, "RISK INDICATORS", ln=True)
            pdf.set_font("helvetica", "B", 14)
            if red_flags_data:
                pdf.set_text_color(*RISK_RED)
            else:
                pdf.set_text_color(*SUCCESS_GREEN)
            pdf.set_xy(x_start + 5, y_start + 12)
            pdf.cell(70, 10, str(len(red_flags_data)), ln=True)
            
            pdf.set_xy(20, y_start + 35)

        pdf.set_font("helvetica", "B", 14)
        pdf.set_text_color(*BRAND_TEAL)
        pdf.cell(0, 10, "Overall Outlook & Synthesis", ln=True)
        pdf.set_font("helvetica", "", 11)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(0, 6, sanitize_text(data.executive_summary))
        pdf.ln(10)

    # --- FINANCIAL OVERVIEW ---
    if "financial_overview" in requested_ids:
        render_section_title("Financial Snapshot")
        for sub in data.financial_overview:
            title_text = getattr(sub, "title", "")
            content_text = getattr(sub, "content", "")
            pdf.set_font("helvetica", "B", 14)
            pdf.set_text_color(*DARK_NAVY)
            pdf.cell(0, 10, sanitize_text(title_text), ln=True)
            pdf.set_font("helvetica", "", 11)
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(0, 6, sanitize_text(content_text))
            pdf.ln(8)

    # --- PERFORMANCE & TRENDS ---
    if "financial_performance" in requested_ids:
        render_section_title("Financial Performance & Trends")
        for sub in data.financial_performance:
            title_text = getattr(sub, "title", "")
            content_text = getattr(sub, "content", "")
            pdf.set_font("helvetica", "B", 14)
            pdf.set_text_color(*DARK_NAVY)
            pdf.cell(0, 10, sanitize_text(title_text), ln=True)
            pdf.set_font("helvetica", "", 11)
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(0, 6, sanitize_text(content_text))
            pdf.ln(8)

    # --- COMPARATIVE ANALYSIS ---
    if "comparative_analysis" in requested_ids and data.comparative_analysis:
        render_section_title("Company Comparison")
        for sub in data.comparative_analysis:
            title_text = getattr(sub, "title", "")
            content_text = getattr(sub, "content", "")
            pdf.set_font("helvetica", "B", 14)
            pdf.set_text_color(*DARK_NAVY)
            pdf.cell(0, 10, sanitize_text(title_text), ln=True)
            pdf.set_font("helvetica", "", 11)
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(0, 6, sanitize_text(content_text))
            pdf.ln(8)

    # --- RED FLAGS ---
    if "risk_analysis" in requested_ids:
        render_section_title("Red Flags & Risk Analysis")
        
        # If we have actual red flag data, display as cards
        if red_flags_data:
            pdf.set_font("helvetica", "B", 12)
            pdf.set_text_color(*RISK_RED)
            pdf.cell(0, 10, f"Identified {len(red_flags_data)} Risk Indicators:", ln=True)
            pdf.ln(5)
            
            for rf in red_flags_data:
                severity = rf.get('severity', 'HIGH').upper()
                title = rf.get('title', 'Unknown Risk')
                desc = rf.get('description', '')
                
                # Check page break
                if pdf.get_y() > 220:
                    pdf.add_page()
                    pdf.draw_border()
                
                pdf.set_fill_color(254, 242, 242) # very light red
                pdf.set_draw_color(252, 165, 165)
                y_start = pdf.get_y()
                
                # We calculate height approx
                lines = max(1, len(desc) // 80)
                box_h = 20 + (lines * 5)
                
                pdf.rect(20, y_start, 170, box_h, style='DF')
                
                pdf.set_xy(25, y_start + 5)
                pdf.set_font("helvetica", "B", 10)
                pdf.set_text_color(*RISK_RED)
                pdf.cell(0, 5, f"[{severity}] {sanitize_text(title)}", ln=True)
                
                pdf.set_xy(25, y_start + 12)
                pdf.set_font("helvetica", "", 10)
                pdf.set_text_color(50, 50, 50)
                pdf.multi_cell(160, 5, sanitize_text(desc))
                
                pdf.set_y(y_start + box_h + 5)
        
        # Also print LLM analysis
        pdf.ln(5)
        for sub in data.risk_analysis:
            title_text = getattr(sub, "title", "")
            content_text = getattr(sub, "content", "")
            pdf.set_font("helvetica", "B", 14)
            pdf.set_text_color(*DARK_NAVY)
            pdf.cell(0, 10, sanitize_text(title_text), ln=True)
            pdf.set_font("helvetica", "", 11)
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(0, 6, sanitize_text(content_text))
            pdf.ln(8)

    # --- AI INSIGHTS ---
    if "ai_insights" in requested_ids:
        render_section_title("AstraFinance AI Intelligence")
        
        pdf.set_fill_color(248, 250, 252)
        pdf.set_draw_color(*BRAND_TEAL)
        y_start = pdf.get_y()
        pdf.rect(20, y_start, 170, 15, style='DF')
        pdf.set_xy(25, y_start + 5)
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(*BRAND_TEAL)
        pdf.cell(0, 5, "Key AI-Generated Strategic Insights", ln=True)
        pdf.set_y(y_start + 20)
        
        pdf.set_font("helvetica", "", 11)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(0, 6, sanitize_text(data.ai_insights))
        pdf.ln(10)

    # --- CONCLUSION ---
    if "conclusion" in requested_ids:
        render_section_title("Conclusion & Outlook")
        pdf.set_font("helvetica", "", 11)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(0, 6, sanitize_text(data.conclusion))
        pdf.ln(10)
        
    # --- DOCUMENT INTELLIGENCE ---
    pdf.add_page()
    pdf.draw_border()
    pdf.set_font("helvetica", "B", 24)
    pdf.set_text_color(*DARK_NAVY)
    pdf.cell(0, 15, "Source Documents", ln=True)
    pdf.set_draw_color(*BRAND_TEAL)
    pdf.set_line_width(1)
    pdf.line(20, pdf.get_y(), 40, pdf.get_y())
    pdf.ln(10)
    
    pdf.set_font("helvetica", "", 11)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 10, f"This report synthesizes intelligence extracted from {len(documents)} source documents.", ln=True)
    pdf.ln(5)
    
    for idx, doc in enumerate(documents):
        pdf.set_font("helvetica", "B", 11)
        pdf.set_text_color(*DARK_NAVY)
        pdf.cell(0, 6, f"{idx+1}. {sanitize_text(doc.get('name', doc.get('filename', 'Unknown')))}", ln=True)
        pdf.set_font("helvetica", "", 10)
        pdf.set_text_color(*TEXT_GRAY)
        date_str = doc.get("created_at", "")
        if hasattr(date_str, "strftime"):
            date_str = date_str.strftime('%B %d, %Y')
        pdf.cell(0, 5, f"Processed on: {date_str} | ID: {str(doc.get('_id', ''))}", ln=True)
        pdf.ln(4)
        
    file_name = f"report_{uuid4().hex}.pdf"
    file_path = os.path.join(output_dir, file_name)
    pdf.output(file_path)
    
    return file_path

from pydantic import BaseModel, Field
from typing import List

class ReportSection(BaseModel):
    title: str = Field(description="The title of the section.")
    content: str = Field(description="The detailed content of this section, written in a professional tone.")

class ReportOutput(BaseModel):
    executive_summary: str = Field(
        description="A high-level summary of the key financial highlights, performance overview, and major takeaways."
    )
    financial_overview: List[ReportSection] = Field(
        default_factory=list,
        description="Key financial metrics and their analysis."
    )
    financial_performance: List[ReportSection] = Field(
        default_factory=list,
        description="Deep dive into financial performance trends and KPIs."
    )
    risk_analysis: List[ReportSection] = Field(
        default_factory=list,
        description="Analysis of detected risk indicators and red flags."
    )
    comparative_analysis: List[ReportSection] = Field(
        default_factory=list,
        description="Comparative analysis across multiple companies (if available)."
    )
    ai_insights: str = Field(
        description="AI-powered insights and strategic commentary based on the data."
    )
    conclusion: str = Field(
        description="Final thoughts and summary to conclude the report."
    )
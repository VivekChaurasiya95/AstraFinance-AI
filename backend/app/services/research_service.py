from app.agents.research_agent import ResearchAgent


class ResearchService:
    def __init__(self):
        self.agent = ResearchAgent()

    def analyze(self, query: str):
        return self.agent.analyze(query)
from app.agents.comparison_agent import ComparisonAgent


class ComparisonService:
    def __init__(self):
        self.agent = ComparisonAgent()

    def compare_companies(self, companies_data):
        return self.agent.compare(companies_data)
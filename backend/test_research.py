import os
import asyncio
from app.agents.research_agent import ResearchAgent

def test():
    agent = ResearchAgent()
    print("Running ResearchAgent...")
    try:
        res = agent.analyze("Analyze Apple's financial health")
        print("Success!")
        print(res)
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test()

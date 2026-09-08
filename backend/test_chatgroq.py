import os
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

models_to_test = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "groq/compound"]

for model_name in models_to_test:
    print(f"Testing model: {model_name}")
    try:
        chat = ChatGroq(model=model_name, temperature=0, max_retries=1)
        response = chat.invoke([HumanMessage(content="Respond with exactly: AstraFinance Groq model test successful.")])
        print(f"[{model_name}] Success! Response: {response.content}")
        
        # Test structured output
        from pydantic import BaseModel, Field
        class TestSchema(BaseModel):
            success: bool = Field(description="Set to true")
            message: str = Field(description="The success message")
            
        try:
            structured_chat = chat.with_structured_output(TestSchema)
            res = structured_chat.invoke([HumanMessage(content="Return success=true and message='AstraFinance Groq model test successful.'")])
            print(f"[{model_name}] Structured output success! {res}")
            print(f"--- SELECTED MODEL: {model_name} ---")
            break
        except Exception as e:
            print(f"[{model_name}] Structured output failed: {e}")
            
    except Exception as e:
        print(f"[{model_name}] Failed: {e}")

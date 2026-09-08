import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("GROQ_API_KEY not found")
    exit(1)

url = "https://api.groq.com/openai/v1/models"
headers = {
    "Authorization": f"Bearer {api_key}"
}

try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    models = response.json().get("data", [])
    
    available_models = [m["id"] for m in models]
    
    target_model = "llama-3.3-70b-versatile"
    
    print("[Groq] Model availability check")
    print(f"Configured model: {target_model}")
    print(f"Available: {'YES' if target_model in available_models else 'NO'}")
    
    print("\n--- Available Models ---")
    for m in sorted(available_models):
        print(f"- {m}")
    
    # Try to find a good 70b replacement
    print("\n[Groq] Suggested Replacements:")
    replacements = [m for m in available_models if "70b" in m.lower() or "8192" in m.lower()]
    for m in replacements:
        print(f"- {m}")

except requests.exceptions.RequestException as e:
    print(f"Failed to query Groq API: {e}")

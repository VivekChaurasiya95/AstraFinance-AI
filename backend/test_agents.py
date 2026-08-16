import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings # type: ignore
from app.agents.extraction_agent import ExtractionAgent # type: ignore
from app.agents.red_flag_agent import RedFlagAgent # type: ignore
from dotenv import load_dotenv

load_dotenv()

async def test_full_pipeline():
    print('Testing extraction and red flag pipeline')
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]
    
    doc = await db.documents.find_one({'status': 'failed'}, sort=[('uploaded_at', -1)])
    if not doc:
        print('No failed documents found in DB. Test skipped.')
        return

    doc_id = doc['_id']
    workspace_id = doc['workspace_id']
    doc_name = doc['name']
    print(f'Testing with document ID: {doc_id} name: {doc_name}')
    
    ea = ExtractionAgent()
    print('Running extraction...')
    res = ea.extract(doc_id)
    key_metrics_count = len(res.get('key_metrics', []))
    print(f'Extraction results metrics count: {key_metrics_count}')
    
    rfa = RedFlagAgent()
    print('Running red flags...')
    rf_res = rfa.analyze(doc_id)
    red_flags_count = len(rf_res.get('red_flags', []))
    risk_level = rf_res.get('risk_level', 'Unknown')
    print(f'Red flags found: {red_flags_count} with risk level: {risk_level}')

if __name__ == '__main__':
    asyncio.run(test_full_pipeline())

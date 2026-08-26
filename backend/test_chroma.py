import chromadb
import os

def test_chroma():
    try:
        path = './chroma_db'
        if not os.path.exists(path):
            print("ChromaDB directory does not exist!")
            return
            
        client = chromadb.PersistentClient(path=path)
        collections = client.list_collections()
        
        print("ChromaDB Connected successfully")
        print(f"Number of collections: {len(collections)}")
        for col in collections:
            count = col.count()
            print(f"- {col.name}: {count} documents indexed")
            
    except Exception as e:
        print(f"ChromaDB Test Failed: {e}")

if __name__ == '__main__':
    test_chroma()

import asyncio
import redis.asyncio as redis

async def test_redis():
    try:
        r = redis.from_url('redis://localhost:6380/0')
        print("Connected to Redis")
        
        # Test SET
        await r.set('test_key', 'test_value', ex=10)
        print("SET successful")
        
        # Test GET
        val = await r.get('test_key')
        print(f"GET successful: {val.decode('utf-8')}")
        
        # Test Invalidation (DEL)
        await r.delete('test_key')
        print("DEL successful")
        
        # Fallback test: Try connecting to wrong port to simulate failure
        try:
            bad_r = redis.from_url('redis://localhost:9999/0', socket_timeout=1)
            await bad_r.ping()
        except Exception as e:
            print(f"Fallback simulated (Exception caught successfully): {e}")
            
    except Exception as e:
        print(f"Redis Test Failed: {e}")

if __name__ == '__main__':
    asyncio.run(test_redis())

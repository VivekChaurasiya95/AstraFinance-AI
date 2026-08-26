import urllib.request
import urllib.error
import json
import ssl

def test_routes():
    base_url = 'http://127.0.0.1:8000'
    try:
        req = urllib.request.urlopen(f"{base_url}/openapi.json")
        openapi = json.loads(req.read())
    except Exception as e:
        print(f"Failed to fetch OpenAPI: {e}")
        return

    routes = openapi.get('paths', {}).keys()
    results = []

    print(f"{'Endpoint':<60} | {'Method':<6} | {'Status':<6}")
    print("-" * 80)

    for route in routes:
        # Replace path parameters with dummies
        test_route = route.replace('{workspace_id}', 'test_ws_123')
        test_route = test_route.replace('{member_id}', 'test_member_123')
        test_route = test_route.replace('{document_id}', 'test_doc_123')
        test_route = test_route.replace('{agent_id}', 'test_agent_123')
        test_route = test_route.replace('{session_id}', 'test_session_123')
        test_route = test_route.replace('{report_id}', 'test_report_123')
        test_route = test_route.replace('{flag_id}', 'test_flag_123')
        test_route = test_route.replace('{notification_id}', 'test_notif_123')

        url = f"{base_url}{test_route}"
        
        try:
            req = urllib.request.Request(url, method='GET')
            # Add a fake token to see 401 vs 403 vs 422
            req.add_header('Authorization', 'Bearer invalid_token_123')
            resp = urllib.request.urlopen(req)
            status = resp.status
        except urllib.error.HTTPError as e:
            status = e.code
        except urllib.error.URLError as e:
            status = 'ERR'
            
        print(f"{test_route:<60} | GET    | {status}")
        results.append({"route": test_route, "status": status})

if __name__ == "__main__":
    test_routes()

import sys
import json
from ddgs import DDGS

def main():
    if len(sys.argv) < 2:
        print(json.dumps([]))
        return
    query = sys.argv[1]
    max_results = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results, safesearch='off'):
                results.append({
                    'title': r.get('title', ''),
                    'link': r.get('href', ''),
                    'snippet': r.get('body', '')
                })
    except Exception as e:
        sys.stderr.write(f"DDGS error: {str(e)}\n")
    print(json.dumps(results))

if __name__ == '__main__':
    main()

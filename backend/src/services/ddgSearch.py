import sys
import json

# Ensure stdout uses utf-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='ignore')

def main():
    if len(sys.argv) < 2:
        print(json.dumps([]))
        return
    query = sys.argv[1]
    max_results = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    results = []
    
    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results, safesearch='off'):
                results.append({
                    'title': r.get('title', ''),
                    'link': r.get('href', ''),
                    'snippet': r.get('body', '')
                })
    except Exception as e:
        sys.stderr.write(f"DDGS error: {str(e)}\n")

    print(json.dumps(results, ensure_ascii=False))

if __name__ == '__main__':
    main()

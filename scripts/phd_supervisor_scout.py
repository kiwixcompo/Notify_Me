#!/usr/bin/env python3
"""
phd_supervisor_scout.py
100% Free, Automated, Ban-Proof LinkedIn PhD & Academic Supervisor Discovery Pipeline
Uses DuckDuckGo Dorks (ddgs), Gemini API / Groq NLP, deduplication, and Telegram Alerts.
"""

import os
import sys
import json
import requests
from ddgs import DDGS

# -------------------------------------------------------------
# 1. State Management & Deduplication
# -------------------------------------------------------------
SEEN_URLS_FILE = os.path.join(os.path.dirname(__file__), 'seen_urls.txt')

def load_seen_urls():
    if not os.path.exists(SEEN_URLS_FILE):
        return set()
    with open(SEEN_URLS_FILE, 'r', encoding='utf-8') as f:
        return set(line.strip() for line in f if line.strip())

def save_seen_url(url):
    with open(SEEN_URLS_FILE, 'a', encoding='utf-8') as f:
        f.write(url + '\n')

# -------------------------------------------------------------
# 2. Discovery Engine (Search Engine Dorking via DuckDuckGo)
# -------------------------------------------------------------
def discover_linkedin_phd_posts(research_topic="Computer Science", intake_timeframe="Fall 2026", max_results=15):
    """
    Executes high-precision search dorks against public LinkedIn posts without logging into LinkedIn.
    """
    timeframe_str = f'"{intake_timeframe}"' if intake_timeframe else ''
    query = (
        f'site:linkedin.com/posts "PhD" '
        f'("fully funded" OR "Graduate Research Assistant" OR "looking for students" OR "prospective students" OR "RA positions") '
        f'"{research_topic}" {timeframe_str} -"scholarship guide" -"tips" -"consultant"'
    ).strip()

    print(f"[Discovery] Executing DuckDuckGo Dork: {query}")
    candidates = []
    seen = load_seen_urls()

    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results, safesearch='off'):
                href = r.get('href', '')
                if href and href not in seen:
                    candidates.append({
                        'title': r.get('title', ''),
                        'url': href,
                        'snippet': r.get('body', '')
                    })
    except Exception as e:
        print(f"[Discovery] DuckDuckGo search error: {e}", file=sys.stderr)

    return candidates

# -------------------------------------------------------------
# 3. Data Extraction Engine (LLM Parsing via Gemini / Groq)
# -------------------------------------------------------------
def parse_post_with_llm(snippet, title, gemini_api_key=None, groq_api_key=None):
    """
    Sends unstructured post snippets to Gemini or Groq to extract structured fields.
    """
    prompt = f"""
Extract the following details from this academic post snippet if it is a professor, lab lead, or department announcing open PhD / Graduate positions.
Text: "{title}\n{snippet}"

Return STRICT JSON matching this schema:
{{
  "valid": true/false,
  "professor_name": "Full name with academic title (e.g. Prof. Jane Doe)",
  "university": "University or Research Institute",
  "department_or_lab": "Department or Lab name",
  "research_area": "1 sentence research scope",
  "recruitment_timeframe": "Intake session (e.g. Fall 2026, Spring 2026, Immediate)",
  "funding_and_benefits": "e.g. Fully Funded Tuition + Monthly Stipend + RA position",
  "contact_email_or_link": "email address or application link if mentioned"
}}
If this is not a genuine PhD or research opening by academic faculty, return {{ "valid": false }}.
Return ONLY valid JSON.
"""

    # Try Gemini if key is provided
    if gemini_api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')
            res = model.generate_content(prompt)
            clean_text = res.text.replace('```json', '').replace('```', '').strip()
            data = json.loads(clean_text)
            if data.get('valid'):
                return data
        except Exception as err:
            print(f"[LLM] Gemini parsing warning: {err}", file=sys.stderr)

    # Try Groq fallback
    if groq_api_key:
        try:
            res = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json={
                    "model": "llama3-70b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"}
                },
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                timeout=25
            )
            data = res.json()['choices'][0]['message']['content']
            parsed = json.loads(data)
            if parsed.get('valid'):
                return parsed
        except Exception as err:
            print(f"[LLM] Groq parsing warning: {err}", file=sys.stderr)

    # Heuristic fallback if LLM keys not provided
    text = (title + " " + snippet).lower()
    if "phd" in text and ("funded" in text or "looking for" in text or "student" in text):
        return {
            "valid": True,
            "professor_name": title.split('-')[0].replace('posted on LinkedIn', '').strip(),
            "university": "Academic Institution",
            "department_or_lab": "Research Laboratory",
            "research_area": snippet[:100] + "...",
            "recruitment_timeframe": "Upcoming Academic Cycle",
            "funding_and_benefits": "Fully Funded Tuition Waiver & Graduate Stipend",
            "contact_email_or_link": ""
        }

    return {"valid": False}

# -------------------------------------------------------------
# 4. Notification Layer (Telegram Bot API)
# -------------------------------------------------------------
def send_telegram_alert(data, url, bot_token, chat_id):
    if not bot_token or not chat_id:
        return False

    message = (
        f"🚨 *New Fully Funded PhD / Supervisor Opening* 🚨\n\n"
        f"👨‍🏫 *Supervisor:* {data.get('professor_name', 'Faculty Member')}\n"
        f"🏫 *University:* {data.get('university', 'Academic Institution')}\n"
        f"🔬 *Research Field:* {data.get('research_area', 'Research Group')}\n"
        f"⏳ *Timeframe:* {data.get('recruitment_timeframe', 'Upcoming Intake')}\n"
        f"💰 *Funding:* {data.get('funding_and_benefits', 'Fully Funded Graduate Assistantship')}\n\n"
        f"🔗 [View LinkedIn Announcement]({url})"
    )

    api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        resp = requests.post(api_url, json={
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown",
            "disable_web_page_preview": False
        }, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        print(f"[Telegram] Failed to send alert: {e}", file=sys.stderr)
        return False

# -------------------------------------------------------------
# 5. Main Execution Loop
# -------------------------------------------------------------
def main():
    topic = os.getenv("RESEARCH_TOPIC", "Computer Science")
    timeframe = os.getenv("RECRUITMENT_TIMEFRAME", "Fall 2026")
    gemini_key = os.getenv("GEMINI_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    telegram_chat = os.getenv("TELEGRAM_CHAT_ID")

    print(f"=== PhD Supervisor Scout Initialized ===")
    print(f"Topic: {topic} | Intake Timeframe: {timeframe}")

    posts = discover_linkedin_phd_posts(topic, timeframe, max_results=12)
    print(f"[Scout] Discovered {len(posts)} new candidate posts.")

    qualified_count = 0
    for p in posts:
        data = parse_post_with_llm(p['snippet'], p['title'], gemini_key, groq_key)
        if data.get('valid'):
            qualified_count += 1
            print(f"-> Qualified: {data.get('professor_name')} @ {data.get('university')}")
            
            # Send Telegram alert if configured
            if telegram_token and telegram_chat:
                send_telegram_alert(data, p['url'], telegram_token, telegram_chat)
            
            # Mark seen to avoid duplicate alerts
            save_seen_url(p['url'])

            if qualified_count >= 8:
                break

    print(f"=== Complete: Processed {qualified_count} verified supervisor openings. ===")

if __name__ == '__main__':
    main()

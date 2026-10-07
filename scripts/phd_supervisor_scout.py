#!/usr/bin/env python3
"""
phd_supervisor_scout.py
100% Free, Automated, Ban-Proof PhD Supervisor Discovery Pipeline
- Search Engine: DuckDuckGo Search (no API key, no rate limits)
- Entity Extraction: Local Industrial spaCy NLP (en_core_web_sm) + Regex (No AI token limits, zero cloud costs)
- State Management: seen_urls.txt tracked by Git (Free)
- Automation: GitHub Actions (2,000 free server minutes/month)
- Alerts: Telegram Bot API (100% free)
"""

import os
import re
import sys
import json
import requests
import spacy

# Load the free, local NLP model (Downloads automatically if not present)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

# Prefer ddgs library, with fallback to duckduckgo_search
try:
    from ddgs import DDGS
except ImportError:
    from duckduckgo_search import DDGS

# Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
DATABASE_FILE = os.path.join(os.path.dirname(__file__), "seen_urls.txt")

# Keywords that signal a genuine PhD funding post
TARGET_KEYWORDS = [
    "fully funded", "phd", "graduate research assistant", "prospective students",
    "fully-funded", "seeking students", "looking for students", "ra position",
    "gra", "tuition waiver", "stipend", "assistant professor", "ph.d."
]

# Noise exclusion keywords
NOISE_KEYWORDS = [
    "admission package", "dm for help", "consultancy", "tips",
    "scholarship guide", "consultant", "whatsapp group", "visa tips"
]

def get_linkedin_posts(research_topic="Computer Science", intake_timeframe="Fall 2026", max_results=30):
    """
    Fetches indexed LinkedIn posts from DuckDuckGo using targeted search dorks.
    Zero-Cost, Ban-Proof: Queries search engine index without logging into LinkedIn.
    """
    timeframe_str = f'"{intake_timeframe}"' if intake_timeframe and intake_timeframe != "Any" else ""
    query = (
        f'site:linkedin.com/posts "PhD" '
        f'("fully funded" OR "prospective students" OR "Graduate Research Assistant" OR "looking for students") '
        f'"{research_topic}" {timeframe_str} -"scholarship guide" -"tips" -"consultancy"'
    ).strip()

    print(f"[Discovery] Querying DuckDuckGo Dork: {query}")
    results = []

    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results, safesearch='off'):
                results.append({
                    'title': r.get('title', ''),
                    'url': r.get('href', ''),
                    'snippet': r.get('body', '')
                })
    except Exception as e:
        print(f"[Discovery] DuckDuckGo search error: {e}", file=sys.stderr)

    return results

def extract_entities(text):
    """
    Uses Local spaCy NLP and Regex to extract Professor Name, University, Timeframe, Funding, and Email.
    Runs 100% locally on the machine / GitHub Actions runner without calling any paid external LLM.
    """
    doc = nlp(text)

    # 1. Extract Person and Organization entities via local spaCy
    people = [ent.text.strip() for ent in doc.ents if ent.label_ == "PERSON" and len(ent.text.strip()) > 3]
    orgs = [ent.text.strip() for ent in doc.ents if ent.label_ == "ORG" and len(ent.text.strip()) > 3]

    # Filter out false positives from orgs
    filtered_orgs = [
        o for o in orgs if not any(w in o.lower() for w in ["phd", "linkedin", "ra", "gra", "ta", "post", "activity"])
    ]

    # 2. Extract Email using Regex
    emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)

    # 3. Detect Recruitment Timeframe
    timeframe_match = re.search(r'\b(Fall|Spring|Summer|Winter)\s+202[4-9]\b', text, re.IGNORECASE)
    detected_timeframe = timeframe_match.group(0) if timeframe_match else "Upcoming Academic Intake"

    # 4. Detect Specific Funding & Benefits
    text_lower = text.lower()
    benefits = []
    if "tuition waiver" in text_lower or "tuition covered" in text_lower or "full tuition" in text_lower:
        benefits.append("Full Tuition Waiver")
    if "stipend" in text_lower or "monthly stipend" in text_lower:
        benefits.append("Monthly Living Stipend")
    if "graduate research assistant" in text_lower or "ra position" in text_lower:
        benefits.append("Graduate Research Assistantship (GRA)")
    if "teaching assistant" in text_lower or "ta position" in text_lower:
        benefits.append("Teaching Assistantship (GTA)")
    if "health insurance" in text_lower or "medical insurance" in text_lower:
        benefits.append("Health Insurance")
    if not benefits and ("fully funded" in text_lower or "fully-funded" in text_lower):
        benefits.append("Full Tuition + Monthly Stipend")

    funding_summary = ", ".join(benefits) if benefits else "Funded Graduate Assistantship / Research Grant"

    # Extract clean professor name from title or entities
    professor_name = people[0] if people else "Faculty Principal Investigator"
    if "posted on LinkedIn" in text:
        parts = text.split("posted on LinkedIn")[0].split("-")[0].strip()
        if len(parts) > 3 and len(parts) < 40:
            professor_name = parts

    return {
        "professor": professor_name,
        "university": filtered_orgs[0] if filtered_orgs else "Academic Institution / University",
        "email": emails[0] if emails else "Check LinkedIn Post",
        "timeframe": detected_timeframe,
        "funding": funding_summary
    }

def is_valid_post(text):
    """
    Rule-based filtering to ensure it's a genuine research opportunity.
    """
    text_lower = text.lower()
    has_target = any(word in text_lower for word in TARGET_KEYWORDS)
    has_noise = any(word in text_lower for word in NOISE_KEYWORDS)
    return has_target and not has_noise

def load_seen_urls():
    if not os.path.exists(DATABASE_FILE):
        return set()
    with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
        return set(line.strip() for line in f if line.strip())

def save_seen_url(url):
    with open(DATABASE_FILE, 'a', encoding='utf-8') as f:
        f.write(f"{url}\n")

def send_telegram_alert(data, url):
    """
    Sends structured alert directly to Telegram without fees.
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False

    message = (
        f"🚨 *New PhD Opening Detected* 🚨\n\n"
        f"👨‍🏫 *Potential Professor:* {data['professor']}\n"
        f"🏫 *Institution:* {data['university']}\n"
        f"⏳ *Timeframe:* {data['timeframe']}\n"
        f"💰 *Funding:* {data['funding']}\n"
        f"📧 *Email / Contact:* `{data['email']}`\n\n"
        f"🔗 [View LinkedIn Post]({url})"
    )
    api_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        resp = requests.post(api_url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown",
            "disable_web_page_preview": False
        }, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        print(f"[Telegram] Failed to send alert: {e}", file=sys.stderr)
        return False

def main():
    topic = os.getenv("RESEARCH_TOPIC", "Computer Science")
    timeframe = os.getenv("RECRUITMENT_TIMEFRAME", "Fall 2026")

    print(f"=== Zero-Cost Local NLP PhD Supervisor Scout ===")
    print(f"Topic: {topic} | Timeframe: {timeframe}")
    print(f"Engine: DuckDuckGo Search + Local spaCy NER (No External AI APIs required)")

    posts = get_linkedin_posts(research_topic=topic, intake_timeframe=timeframe, max_results=30)
    seen_urls = load_seen_urls()
    print(f"[Scout] Retrieved {len(posts)} posts from DuckDuckGo.")

    alert_count = 0
    for post in posts:
        url = post['url']
        snippet = post['snippet']
        title = post['title']

        if url in seen_urls:
            continue

        full_content = f"{title}. {snippet}"

        if is_valid_post(full_content):
            extracted_data = extract_entities(full_content)
            
            # Send alert to Telegram
            if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
                send_telegram_alert(extracted_data, url)
                print(f"[Alert Sent] {extracted_data['professor']} @ {extracted_data['university']}")
            else:
                print(f"[Match Found] {extracted_data['professor']} @ {extracted_data['university']} | Timeframe: {extracted_data['timeframe']}")

            save_seen_url(url)
            alert_count += 1

            if alert_count >= 8:
                break

    print(f"=== Completed: Processed {alert_count} new opportunities. ===")

if __name__ == "__main__":
    main()

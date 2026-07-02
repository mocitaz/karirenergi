#!/usr/bin/env python3
import sys
import os
import json
import time
import re

# Premium ASCII art header
print("=" * 60)
print("             KARIRENERGI AUTOMATED PLAYWRIGHT SCRAPER")
print("=" * 60)

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("\n[!] ERROR: Playwright is not installed.")
    print("    Silakan pasang dengan menjalankan perintah berikut di terminal Anda:")
    print("    pip install playwright && playwright install")
    print("=" * 60)
    sys.exit(1)

# Configuration & UUIDs
WIDGET_DETAIL_UUID = "845abfe1-3f9d-4b3a-bda5-0a9f2f9083c2"
VACANCY_REGEX = re.compile(
    r"845abfe1-3f9d-4b3a-bda5-0a9f2f9083c2/\?id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
    re.IGNORECASE
)

REQUIREMENT_KEYWORDS = [
    "menguasai", "mampu", "memiliki", "detail", "big data", "advanced", "problem", 
    "data analysis", "data visualization", "analytical", "soft skill", "hard skill", 
    "communicative", "power bi", "excel", "word", "powerpoint", "canva", "adobe", 
    "active", "presentation", "compliance", "procurement", "reporting", "critical", 
    "discipline", "work ethic", "berdomisi", "bersedia", "dapat", "inisiatif", 
    "observasi", "komunikatif", "leadership", "english", "menulis", "tulisan", 
    "laporan", "minat", "pengalaman", "pemahaman", "proaktif", "attention", 
    "teamwork", "learning", "claims", "contract", "machine learning", "procedure", 
    "desain", "editing", "visualisasi", "stakeholder", "speaking", "planning", 
    "strategic", "event", "office", "ms.", "microsoft", "kualifikasi", "requirements", 
    "tata kelola", "document", "analisa", "pengolahan", "penyusunan",
    "git", "coding", "software", "application", "cloud", "java", "python", "javascript", 
    "html", "css", "sql", "c++", "c#", "php", "golang", "rust", "react", "node", "aws", 
    "docker", "kubernetes", "figma", "ui/ux", "hardskill", "softskill", "skills", 
    "knowledge", "ability", "capability", "experience", "understanding", "interest", 
    "passion", "adaptability", "resilience", "adaptive", "writing", "listening", 
    "thinking", "solving", "oriented", "project management", "stakeholder management", 
    "data management", "waste management", "emergency response"
]

def clean_jurusan(jurusan_str):
    if not jurusan_str:
        return "Semua Jurusan / Tidak tertera"
    
    dirty_indicator = "$(document).ready"
    if dirty_indicator in jurusan_str:
        idx = jurusan_str.find(dirty_indicator)
        jurusan_str = jurusan_str[:idx]
        
    # Insert space at camelCase boundary
    cleaned = re.sub(r'([a-z])([A-Z])', r'\1, \2', jurusan_str)
    
    # Split by separators
    tokens = re.split(r',|;|dan|\bserta\b', cleaned, flags=re.IGNORECASE)
    
    valid_majors = []
    for token in tokens:
        token = token.strip()
        if not token:
            continue
        
        token_lower = token.lower()
        has_keyword = False
        for kw in REQUIREMENT_KEYWORDS:
            if kw in token_lower:
                has_keyword = True
                break
        
        if has_keyword:
            break
            
        valid_majors.append(token)
        
    if not valid_majors:
        return "Semua Jurusan / Tidak tertera"
        
    final_str = ", ".join(valid_majors).strip().rstrip(",. ")
    return final_str if final_str else "Semua Jurusan / Tidak tertera"


def run():
    print("[*] Memulai browser Chromium (Playwright)...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Go to main Pertamina recruitment page
        print("[*] Menghubungi https://recruitment.pertamina.com ...")
        page.goto("https://recruitment.pertamina.com", timeout=60000)
        
        # Wait for listings container to load
        print("[*] Menunggu widget lowongan dimuat...")
        page.wait_for_timeout(4000) # Jeda awal untuk inisialisasi iframe widget
        
        unique_jobs = []
        page_num = 1
        
        print("[*] Memulai pemindaian halaman daftar loker...")
        while True:
            print(f"    - Memindai halaman {page_num}...")
            
            # Find all potential links matching our widget detail path in the current page
            html_content = page.content()
            matches = VACANCY_REGEX.findall(html_content)
            
            # Locate cards/table rows in the page to extract judul, perusahaan, kuota, pelamar
            # We will query elements directly from DOM
            job_elements = page.query_selector_all(".job-item, .card, tr, [class*='card']")
            
            for el in job_elements:
                el_html = el.inner_html()
                match = VACANCY_REGEX.search(el_html)
                if match:
                    vacancy_id = match.group(1)
                    
                    # Prevent duplicates
                    if any(j['id'] == vacancy_id for j in unique_jobs):
                        continue
                        
                    el_text = el.inner_text()
                    lines = [l.strip() for l in el_text.split('\n') if l.strip()]
                    if not lines:
                        continue
                        
                    judul = lines[0]
                    # Filter out header/nav words
                    if "beranda" in judul.lower() or "riwayat" in judul.lower() or len(judul) < 5:
                        continue
                        
                    perusahaan = "PT Pertamina"
                    if len(lines) > 1 and len(lines[1]) > 3 and "internship" not in lines[1].lower():
                        perusahaan = lines[1]
                        
                    kuota = 1
                    pelamar = 0
                    
                    match_posisi = re.search(r'(\d+)\s+posisi', el_text, re.IGNORECASE)
                    match_pelamar = re.search(r'(\d+)\s+pelamar', el_text, re.IGNORECASE)
                    if match_posisi:
                        kuota = int(match_posisi.group(1))
                    if match_pelamar:
                        pelamar = int(match_pelamar.group(1))
                        
                    unique_jobs.append({
                        "id": vacancy_id,
                        "judul": judul,
                        "perusahaan": perusahaan,
                        "detailUrl": f"https://recruitment.pertamina.com/object/widget/{WIDGET_DETAIL_UUID}/?id={vacancy_id}",
                        "kuota": kuota,
                        "pelamar": pelamar
                    })
            
            # Find next page button
            next_btn = page.query_selector('[aria-label="Next"], [aria-label="Next Page"], .next-page, .next, .pagination-next')
            if not next_btn:
                # Fallback text check
                elements = page.query_selector_all("a, button, li, span")
                for el in elements:
                    txt = el.inner_text().strip().lower()
                    if txt in ['next', 'selanjutnya', '>', '»']:
                        # Make sure it is not disabled
                        is_disabled = el.evaluate("el => el.disabled || el.hasAttribute('disabled') || el.classList.contains('disabled')")
                        if not is_disabled:
                            next_btn = el
                            break
            
            if next_btn:
                is_disabled = next_btn.evaluate("el => el.disabled || el.hasAttribute('disabled') || el.classList.contains('disabled')")
                if is_disabled:
                    print("    - Sudah di halaman terakhir (tombol disabled).")
                    break
                
                try:
                    next_btn.click()
                    page_num += 1
                    page.wait_for_timeout(2500) # Jeda loading page baru
                except Exception as e:
                    print(f"    - Gagal mengklik tombol selanjutnya: {e}")
                    break
            else:
                print("    - Tidak ditemukan tombol selanjutnya.")
                break
                
        print(f"\n[+] Sukses mendeteksi {len(unique_jobs)} lowongan magang.")
        if not unique_jobs:
            print("[!] Peringatan: Tidak ada lowongan yang ditemukan. Mematikan skraper...")
            browser.close()
            return
            
        print("\n[*] Memulai Fase 2: Mengambil detail lowongan secara paralel...")
        hasil_scraping = []
        
        # Scrape details
        for idx, job in enumerate(unique_jobs):
            print(f"    [{idx + 1}/{len(unique_jobs)}] Memindai: {job['judul']} ({job['perusahaan']})")
            
            detail_page = browser.new_page()
            try:
                detail_page.goto(job["detailUrl"], timeout=20000)
                # Wait for core layout or location icon to render
                detail_page.wait_for_timeout(1500) # Give 1.5s for client-side JavaScript to render elements
                
                # Extract clean text lines from body
                full_text = detail_page.evaluate("() => document.body.innerText")
                lines = [l.strip() for l in full_text.split('\n') if l.strip()]
                
                kota = "Tidak tertera"
                industri = "Tidak tertera"
                sektor = "Energy"
                pendidikan = "Tidak tertera"
                jurusan = "Semua Jurusan / Tidak tertera"
                
                # 1. Location
                icon_location = detail_page.query_selector('.icon--location, .icon-location, i[class*="location"]')
                if icon_location:
                    kota = icon_location.evaluate("el => el.parentElement.innerText").strip()
                    
                # 2. Industry
                icon_industry = detail_page.query_selector('.icon--tag, .icon-tag, i[class*="tag"], i[class*="industry"]')
                if icon_industry:
                    industri = icon_industry.evaluate("el => el.parentElement.innerText").strip()
                    
                # 3. Sector
                icon_sector = detail_page.query_selector('.icon--briefcase, .icon-briefcase, .icon--bag, .icon-bag, i[class*="briefcase"]')
                if icon_sector:
                    sektor = icon_sector.evaluate("el => el.parentElement.innerText").strip()
                    
                # Fallbacks from lines
                index_kota = -1
                for j, line in enumerate(lines):
                    lower_line = line.lower()
                    if lower_line.startswith("kota ") or lower_line.startswith("kab. ") or lower_line.startswith("kabupaten "):
                        if kota == "Tidak tertera":
                            kota = line
                        index_kota = j
                        break
                        
                if index_kota != -1:
                    if industri == "Tidak tertera" and len(lines) > index_kota + 1:
                        nxt = lines[index_kota + 1]
                        if "job description" not in nxt.lower() and "requirements" not in nxt.lower():
                            industri = nxt
                    if sektor == "Energy" and len(lines) > index_kota + 2:
                        nxt_sektor = lines[index_kota + 2]
                        if "job description" not in nxt_sektor.lower() and "requirements" not in nxt_sektor.lower() and "-" not in nxt_sektor:
                            sektor = nxt_sektor
                            
                # Cleaning symbols
                kota = re.sub(r'[\s\-\•\.\,]+$', '', kota).strip()
                industri = re.sub(r'[\s\-\•\.\,]+$', '', industri).strip()
                sektor = re.sub(r'[\s\-\•\.\,]+$', '', sektor).strip()
                
                # Regex patterns for Education and Majors
                match_edu = re.search(r'(?:Tingkat\s+)?Pendidikan\s*:\s*([^\n\r]+)', full_text, re.IGNORECASE)
                if match_edu:
                    val = match_edu.group(1).strip()
                    idx_jur = val.lower().find("jurusan")
                    if idx_jur != -1:
                        val = val[:idx_jur].strip()
                    pendidikan = re.sub(r'[\s:-]+$', '', val).strip()
                    
                match_jur = re.search(r'Jurusan\s*:\s*([^\n\r]+)', full_text, re.IGNORECASE)
                if match_jur:
                    val = match_jur.group(1).strip()
                    idx_req = val.lower().find("requirements")
                    if idx_req != -1:
                        val = val[:idx_req].strip()
                    jurusan = clean_jurusan(val)
                    
                hasil_scraping.append({
                    "Judul Lowongan": job["judul"],
                    "Perusahaan": job["perusahaan"],
                    "Kota": kota,
                    "Industri": industri,
                    "Sektor": sektor,
                    "Pendidikan": pendidikan,
                    "Jurusan": jurusan,
                    "Kuota": job["kuota"],
                    "Pelamar": job["pelamar"],
                    "Link Detail": job["detailUrl"]
                })
                
            except Exception as ex:
                print(f"      [!] Gagal memindai lowongan: {ex}")
            finally:
                detail_page.close()
                
        browser.close()
        
        # Save output to JSON BARU
        os.makedirs("JSON BARU", exist_ok=True)
        output_path = "JSON BARU/loker_data_scraped.json"
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(hasil_scraping, f, indent=4, ensure_ascii=False)
            
        print("=" * 60)
        print(f"[+] SELESAI: Sukses memindai {len(hasil_scraping)} lowongan.")
        print(f"[+] Output disimpan di: {output_path}")
        print("=" * 60)

if __name__ == "__main__":
    run()

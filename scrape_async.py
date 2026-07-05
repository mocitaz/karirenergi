#!/usr/bin/env python3
import sys
import os
import json
import time
import re
import difflib
import asyncio

# ASCII Art Header
print("=" * 60)
print("         KARIRENERGI HIGH-SPEED ASYNC PLAYWRIGHT SCRAPER")
print("=" * 60)

try:
    from playwright.async_api import async_playwright
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
    "editing", "visualisasi", "stakeholder", "speaking", "planning", 
    "strategic", "event", "office", "ms.", "microsoft", "kualifikasi", "requirements", 
    "tata kelola", "document", "analisa", "pengolahan", "penyusunan",
    "git", "coding", "application", "cloud", "java", "python", "javascript", 
    "html", "css", "sql", "c++", "c#", "php", "golang", "rust", "react", "node", "aws", 
    "docker", "kubernetes", "figma", "ui/ux", "hardskill", "softskill", "skills", 
    "knowledge", "ability", "capability", "experience", "understanding", "interest", 
    "passion", "adaptability", "resilience", "adaptive", "writing", "listening", 
    "thinking", "solving", "oriented", "project management", "stakeholder management", 
    "data management", "waste management", "emergency response"
]

STANDARDIZED_MAJORS = [
    "Teknik Informatika",
    "Sistem Informasi",
    "Ilmu Komputer",
    "Teknologi Informasi",
    "Rekayasa Perangkat Lunak",
    "Informatika",
    "Ilmu Komunikasi",
    "Hubungan Internasional",
    "Desain Komunikasi Visual",
    "Desain Grafis",
    "Akuntansi",
    "Manajemen",
    "Administrasi Bisnis",
    "Administrasi Publik",
    "Psikologi",
    "Hukum",
    "Statistika",
    "Matematika",
    "Fisika",
    "Kimia",
    "Biologi",
    "Bioteknologi",
    "Sastra Inggris",
    "Hubungan Masyarakat",
    "Kesehatan & Keselamatan Kerja (K3)",
    "Teknik Industri",
    "Teknik Elektro",
    "Teknik Mesin",
    "Teknik Kimia",
    "Teknik Sipil",
    "Teknik Perminyakan",
    "Teknik Pertambangan",
    "Teknik Geologi",
    "Teknik Geofisika",
    "Teknik Kelautan",
    "Teknik Lingkungan",
    "Teknik Fisika",
    "Teknik Metalurgi",
    "Teknik Perkapalan"
]

def clean_jurusan(jurusan_str):
    if not jurusan_str:
        return "Semua Jurusan / Tidak Tertera"
    
    dirty_indicator = "$(document).ready"
    if dirty_indicator in jurusan_str:
        idx = jurusan_str.find(dirty_indicator)
        jurusan_str = jurusan_str[:idx]
        
    cleaned = re.sub(r'([a-z])([A-Z])', r'\1, \2', jurusan_str)
    
    cleaned = re.sub(r'keselamatan\s+dan\s+kesehatan\s+kerja(?:\s*\(k3\))?', 'Kesehatan & Keselamatan Kerja (K3)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'keselamatan\s+kesehatan\s+kerja(?:\s*\(k3\))?', 'Kesehatan & Keselamatan Kerja (K3)', cleaned, flags=re.IGNORECASE)
    
    tokens = re.split(r',|;|\bdan\b|\bserta\b', cleaned, flags=re.IGNORECASE)
    
    MAJOR_CORRECTIONS = {
        "desain komunikasi visual (animation)": "Desain Komunikasi Visual",
        "desain komunikasi visual animation": "Desain Komunikasi Visual",
        "design komunikasi visual (animation)": "Desain Komunikasi Visual",
        "design komunikasi visual (dkv)": "Desain Komunikasi Visual",
        "design komunikasi visual": "Desain Komunikasi Visual",
        "design grafis": "Desain Grafis",
        "dkv": "Desain Komunikasi Visual",
        "all": "Semua Jurusan / Tidak Tertera",
        "biotechnology": "Bioteknologi",
        "business anaytics": "Business Analytics",
        "business information system": "Business Information System",
        "bussines administration": "Business Administration",
        "bussines management": "Business Management",
        "business management": "Business Management",
        "cyber security / keamanan siber": "Cyber Security / Keamanan Siber",
        "data science / sains data": "Data Science / Sains Data",
        "esri arc": "Semua Jurusan / Tidak Tertera",
        "konsep dasar pengembangan aplikasi": "Semua Jurusan / Tidak Tertera",
        "security": "Cyber Security",
        "applied chemistry": "Applied Chemistry",
        "teknik elektro (fokus di program studi pemrograman it)": "Teknik Elektro",
        "teknik industri": "Teknik Industri",
        "teknologi informasi": "Teknologi Informasi",
        "informatics": "Informatika",
        "information systems": "Sistem Informasi",
        "information system": "Sistem Informasi",
        "information technology": "Teknologi Informasi",
        "international relations": "Hubungan Internasional",
        "communications": "Ilmu Komunikasi",
        "economics": "Ekonomi",
        "k3": "Kesehatan & Keselamatan Kerja (K3)",
        "k3u": "Kesehatan & Keselamatan Kerja (K3)",
        "kesehatan kerja (k3)": "Kesehatan & Keselamatan Kerja (K3)",
        "kesehatan keselamatan kerja": "Kesehatan & Keselamatan Kerja (K3)",
        "kesehatan kerja": "Kesehatan & Keselamatan Kerja (K3)",
        "seluruh teknik": "Semua Jurusan Teknik",
        "semua jurusan teknik": "Semua Jurusan Teknik",
        "akturia": "Aktuaria",
        "akutansi": "Akuntansi",
        "psiklogi": "Psikologi",
        "admitrasi": "Administrasi",
        "keskatriatan": "Kesekretariatan",
        "hukum pi": "Hukum Pidana",
        "bisnis management": "Business Management",
        "electro": "Teknik Elektro",
        "industrial engineering": "Teknik Industri",
        "management": "Manajemen",
        "management / administrasi bisnis": "Manajemen / Administrasi Bisnis",
        "system computer": "Sistem Komputer",
        "public relation": "Public Relations",
        "teknik metallurgy": "Teknik Metalurgi",
    }
    
    def capitalize_major(major_name):
        words = major_name.split(" ")
        capitalized_words = []
        acronyms = {"it", "dkv", "k3", "tkj", "esri", "s1", "d3", "d4", "hise", "hse", "hrd", "pr", "ai", "dkv)"}
        for word in words:
            clean_word = word.strip("()/,.-")
            if clean_word.lower() in acronyms:
                capitalized_words.append(word.upper())
            elif "/" in word:
                parts = word.split("/")
                capitalized_parts = [p[0].upper() + p[1:] if len(p) > 1 else p.upper() for p in parts]
                capitalized_words.append("/".join(capitalized_parts))
            else:
                if len(word) > 1:
                    if word.startswith("("):
                        capitalized_words.append("(" + word[1].upper() + word[2:])
                    else:
                        capitalized_words.append(word[0].upper() + word[1:])
                else:
                    capitalized_words.append(word.upper())
        return " ".join(capitalized_words)

    valid_majors = []
    for token in tokens:
        token = token.strip()
        token = re.sub(r'^[^a-zA-Z0-9\(]+|[^a-zA-Z0-9\)]+$', '', token).strip()
        if not token or len(token) <= 1:
            continue
        
        token_lower = token.lower()
        has_keyword = False
        for kw in REQUIREMENT_KEYWORDS:
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, token_lower):
                has_keyword = True
                break
        
        if has_keyword:
            break
            
        for typo, correction in sorted(MAJOR_CORRECTIONS.items(), key=lambda x: len(x[0]), reverse=True):
            if correction.lower() in token.lower():
                continue
            left_boundary = r'\b' if typo[0].isalnum() else ''
            right_boundary = r'\b' if typo[-1].isalnum() else ''
            pattern = left_boundary + re.escape(typo) + right_boundary
            if re.search(pattern, token_lower):
                token = re.sub(pattern, correction, token, flags=re.IGNORECASE)
                token_lower = token.lower()
                
        best_match = None
        best_ratio = 0.0
        for std_major in STANDARDIZED_MAJORS:
            ratio = difflib.SequenceMatcher(None, token_lower.strip(), std_major.lower()).ratio()
            if ratio > 0.80 and ratio > best_ratio:
                best_ratio = ratio
                best_match = std_major
        if best_match:
            token = best_match
            token_lower = token.lower()

        token = re.sub(r'\s+', ' ', token).strip()
        token = capitalize_major(token)
        valid_majors.append(token)
        
    if not valid_majors:
        return "Semua Jurusan / Tidak Tertera"
        
    final_str = ", ".join(valid_majors).strip().rstrip(",. ")
    return final_str if final_str else "Semua Jurusan / Tidak Tertera"


async def block_resources(route):
    """Abort loading css, images, fonts, and tracking scripts to speed up loading by 5x-10x"""
    req_type = route.request.resource_type
    url = route.request.url.lower()
    
    # Block static resources
    if req_type in ["image", "stylesheet", "font", "media"]:
        await route.abort()
        return
        
    # Block trackers, analytics, & ads
    trackers = [
        "google-analytics", "googletagmanager", "doubleclick", 
        "facebook.net", "hotjar", "ads", "analytics"
    ]
    if any(t in url for t in trackers):
        await route.abort()
        return
        
    await route.continue_()


async def scrape_detail_worker(context, job_queue, results_list, progress_tracker):
    """Worker task that processes job detail pages from queue concurrently"""
    page = await context.new_page()
    # Apply resource blocking route
    await page.route("**/*", block_resources)
    
    while True:
        try:
            job = job_queue.get_nowait()
        except asyncio.QueueEmpty:
            break

        idx = progress_tracker["current"]
        progress_tracker["current"] += 1
        print(f"    [{idx + 1}/{progress_tracker['total']}] Fetching detail: {job['judul']}...")
        
        success = False
        retries = 2
        
        while retries >= 0 and not success:
            try:
                # 15s timeout because resources are blocked, should load instantly
                await page.goto(job["detailUrl"], timeout=15000, wait_until="commit")
                
                # Dynamic wait for Location tag or specific text in body (max 2s)
                try:
                    await page.wait_for_selector(".icon--location, .icon-location, i[class*='location']", timeout=2000)
                except:
                    # Fallback text load
                    await page.wait_for_timeout(1000)
                
                # Fetch page content text
                full_text = await page.evaluate("() => document.body.innerText")
                lines = [l.strip() for l in full_text.split('\n') if l.strip()]
                
                # Extract locations, tags, and briefcase categories
                kota = "Tidak tertera"
                industri = "Tidak tertera"
                sektor = "Energy"
                
                # Location element
                loc_el = await page.query_selector(".icon--location, .icon-location, i[class*='location']")
                if loc_el:
                    kota = (await loc_el.evaluate("el => el.parentElement.innerText")).strip()
                
                # Industry element
                ind_el = await page.query_selector(".icon--tag, .icon-tag, i[class*='tag'], i[class*='industry']")
                if ind_el:
                    industri = (await ind_el.evaluate("el => el.parentElement.innerText")).strip()
                
                # Sector element
                sec_el = await page.query_selector(".icon--briefcase, .icon-briefcase, .icon--bag, .icon-bag, i[class*='briefcase']")
                if sec_el:
                    sektor = (await sec_el.evaluate("el => el.parentElement.innerText")).strip()
                
                # Fallback parser from text lines
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
                
                # Sanitize extracted values
                kota = re.sub(r'[\s\-\•\.\,]+$', '', kota).strip()
                industri = re.sub(r'[\s\-\•\.\,]+$', '', industri).strip()
                sektor = re.sub(r'[\s\-\•\.\,]+$', '', sektor).strip()
                
                pendidikan = "Tidak tertera"
                match_edu = re.search(r'(?:Tingkat\s+)?Pendidikan\s*:\s*([^\n\r]+)', full_text, re.IGNORECASE)
                if match_edu:
                    val = match_edu.group(1).strip()
                    idx_jur = val.lower().find("jurusan")
                    if idx_jur != -1:
                        val = val[:idx_jur].strip()
                    pendidikan = re.sub(r'[\s:-]+$', '', val).strip()
                
                jurusan = "Semua Jurusan / Tidak tertera"
                match_jur = re.search(r'Jurusan\s*:\s*([^\n\r]+)', full_text, re.IGNORECASE)
                if match_jur:
                    val = match_jur.group(1).strip()
                    idx_req = val.lower().find("requirements")
                    if idx_req != -1:
                        val = val[:idx_req].strip()
                    jurusan = clean_jurusan(val)
                
                job_desc = "Tidak tertera"
                job_desc_match = re.search(r'Job Description([\s\S]*?)(?=Requirements|$)', full_text, re.IGNORECASE)
                if job_desc_match:
                    text = job_desc_match.group(1).strip()
                    if text.startswith(":"):
                        text = text[1:].strip()
                    footer_match = re.search(r'cookies consent|copyright', text, re.IGNORECASE)
                    if footer_match:
                        text = text[:footer_match.start()].strip()
                    job_desc = re.sub(r'[\s\-•\.,]+$', '', text).strip()
                
                requirements = "Tidak tertera"
                req_match = re.search(r'Requirements([\s\S]*?)(?=\$\(document\)\.ready|Apply|$)', full_text, re.IGNORECASE)
                if req_match:
                    text = req_match.group(1).strip()
                    if text.startswith(":"):
                        text = text[1:].strip()
                    footer_match = re.search(r'cookies consent|copyright', text, re.IGNORECASE)
                    if footer_match:
                        text = text[:footer_match.start()].strip()
                    requirements = re.sub(r'[\s\-•\.,]+$', '', text).strip()
                
                results_list.append({
                    "Judul Lowongan": job["judul"],
                    "Perusahaan": job["perusahaan"],
                    "Kota": kota,
                    "Industri": industri,
                    "Sektor": sektor,
                    "Pendidikan": pendidikan,
                    "Jurusan": jurusan,
                    "Kuota": job["kuota"],
                    "Pelamar": job["pelamar"],
                    "Link Detail": job["detailUrl"],
                    "Deskripsi Pekerjaan": job_desc,
                    "Persyaratan": requirements
                })
                success = True
            except Exception as e:
                retries -= 1
                if retries < 0:
                    print(f"      [!] Gagal memproses {job['judul']} setelah beberapa percobaan: {e}")
                else:
                    await page.wait_for_timeout(1000)
        
        job_queue.task_done()
        
    await page.close()


async def main():
    session_file = "pertamina_session.json"
    
    async with async_playwright() as p:
        has_session = os.path.exists(session_file)
        
        if not has_session:
            print("\n============================================================")
            print("                 INISIALISASI LOGIN PERTAMINA")
            print("============================================================")
            print("[*] Sesi login tidak ditemukan. Membuka browser visual...")
            
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context()
            page = await context.new_page()
            
            print("[*] Menghubungi https://recruitment.pertamina.com ...")
            await page.goto("https://recruitment.pertamina.com")
            
            print("\n[!] TINDAKAN DIPERLUKAN:")
            print("    1. Silakan login ke akun Pertamina Anda pada jendela browser.")
            print("    2. Buka halaman daftar lowongan/magang.")
            print("    3. Tekan [ENTER] di terminal ini untuk menyimpan sesi & mulai scraping.")
            
            # Run in executor to not block async loop
            await asyncio.get_event_loop().run_in_executor(None, input, "\nTekan [ENTER] setelah siap...")
            
            await context.storage_state(path=session_file)
            print(f"[+] Sesi login sukses disimpan ke '{session_file}'!")
        else:
            print("[*] Menggunakan sesi login tersimpan...")
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(storage_state=session_file)
            page = await context.new_page()
            print("[*] Menghubungi https://recruitment.pertamina.com ...")
            await page.goto("https://recruitment.pertamina.com")
            await page.wait_for_timeout(5000)
            
        # Clear cookies/consent modals
        try:
            cookie_btn = await page.query_selector("button:has-text('I understand'), :text('I understand')")
            if cookie_btn:
                await cookie_btn.click()
                print("[*] Menutup Cookies Consent...")
        except:
            pass
            
        try:
            warning_btn = await page.query_selector("button:has-text('Ya, saya mengerti'), :text('Ya, saya mengerti')")
            if warning_btn:
                await warning_btn.click()
                print("[*] Menutup Pengumuman Waspada...")
        except:
            pass
            
        unique_jobs = []
        page_num = 1
        
        print("[*] Memulai pemindaian halaman daftar loker...")
        
        while True:
            print(f"    - Memindai halaman {page_num}...")
            
            # Fetch current items in listing
            job_elements = await page.query_selector_all(".job-item, .card, tr, [class*='card']")
            
            for el in job_elements:
                el_html = await el.inner_html()
                match = VACANCY_REGEX.search(el_html)
                if match:
                    vacancy_id = match.group(1)
                    
                    if any(j['id'] == vacancy_id for j in unique_jobs):
                        continue
                        
                    el_text = await el.inner_text()
                    lines = [l.strip() for l in el_text.split('\n') if l.strip()]
                    if not lines:
                        continue
                        
                    judul = lines[0]
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
            
            # Evaluate next page button in page context
            next_btn_handle = await page.evaluate_handle("""() => {
                let btn = document.querySelector('[aria-label=\"Next\"], [aria-label=\"Next Page\"], .next-page, .next, .pagination-next');
                if (btn && !btn.disabled && !btn.hasAttribute('disabled') && !btn.classList.contains('disabled')) {
                    if (btn.parentElement && btn.parentElement.classList.contains('disabled')) return null;
                    return btn;
                }
                
                const elements = Array.from(document.querySelectorAll('a, button, li, span'));
                for (let el of elements) {
                    const txt = el.innerText.trim().toLowerCase();
                    if (txt === 'next' || txt === 'selanjutnya' || txt === '>' || txt === '»') {
                        const isD = el.disabled || el.hasAttribute('disabled') || el.classList.contains('disabled') || (el.parentElement && el.parentElement.classList.contains('disabled'));
                        if (!isD) return el;
                    }
                }
                return null;
            }""")
            
            next_btn = next_btn_handle.as_element()
            if next_btn:
                is_disabled = await next_btn.evaluate("el => el.disabled || el.hasAttribute('disabled') || el.classList.contains('disabled')")
                if is_disabled:
                    print("    - Sudah di halaman terakhir (tombol disabled).")
                    break
                
                try:
                    await next_btn.click()
                    page_num += 1
                    await page.wait_for_timeout(2500)
                except Exception as e:
                    print(f"    - Gagal pindah ke halaman berikutnya: {e}")
                    break
            else:
                print("    - Tidak ditemukan tombol selanjutnya.")
                break
                
        print(f"\n[+] Sukses mendeteksi {len(unique_jobs)} lowongan magang.")
        await page.close()
        
        if not unique_jobs:
            print("[!] Peringatan: Tidak ada lowongan yang ditemukan. Mematikan skraper...")
            await browser.close()
            return
            
        print("\n[*] Memulai Fase 2: Mengambil detail lowongan secara paralel (concurrency=10)...")
        hasil_scraping = []
        
        # Build queue
        job_queue = asyncio.Queue()
        for job in unique_jobs:
            await job_queue.put(job)
            
        progress_tracker = {
            "current": 0,
            "total": len(unique_jobs)
        }
        
        # We will use 10 concurrent worker tasks
        concurrency = 10
        workers = []
        for i in range(concurrency):
            task = asyncio.create_task(
                scrape_detail_worker(context, job_queue, hasil_scraping, progress_tracker)
            )
            workers.append(task)
            
        start_time = time.time()
        await asyncio.gather(*workers)
        end_time = time.time()
        
        await browser.close()
        
        # Save output to JSON BARU
        os.makedirs("JSON BARU", exist_ok=True)
        output_path = "JSON BARU/loker_data_scraped.json"
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(hasil_scraping, f, indent=4, ensure_ascii=False)
            
        duration = end_time - start_time
        print("=" * 60)
        print(f"[+] SELESAI: Sukses memindai {len(hasil_scraping)} lowongan dalam {duration:.1f} detik.")
        print(f"[+] Rata-rata: {duration/max(1, len(hasil_scraping)):.2f} detik per lowongan.")
        print(f"[+] Output disimpan di: {output_path}")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())

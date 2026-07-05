#!/usr/bin/env python3
import sys
import os
import json
import time
import re
import difflib
import asyncio

# ANSI Colors for premium dashboard output
C_BLUE = '\033[94m'
C_GREEN = '\033[92m'
C_YELLOW = '\033[93m'
C_RED = '\033[91m'
C_CYAN = '\033[96m'
C_MAGENTA = '\033[95m'
C_RESET = '\033[0m'
C_BOLD = '\033[1m'

print("=" * 65)
print(f"{C_BOLD}{C_CYAN}    KARIRENERGI RESILIENT HIGH-SPEED ASYNC PLAYWRIGHT SCRAPER{C_RESET}")
print("=" * 65)

try:
    from playwright.async_api import async_playwright
except ImportError:
    print(f"\n{C_RED}[!] ERROR: Playwright is not installed.{C_RESET}")
    print("    Silakan pasang dengan menjalankan perintah berikut di terminal Anda:")
    print("    pip install playwright && playwright install")
    print("=" * 65)
    sys.exit(1)

# Configuration & UUIDs
WIDGET_DETAIL_UUID = "845abfe1-3f9d-4b3a-bda5-0a9f2f9083c2"
START_URL = "https://recruitment.pertamina.com/object/page/135901b0-ec27-48d4-9dda-9516fc506970#!/object/widget/bf1c31dc-9341-47ff-ac76-0fa9a30065ac/?search=true&recruitmentTypeId=a670eeb5-ad29-4d2f-90f9-a3dc26128084&isInternship=true&filter=true"
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
    "Teknik Informatika", "Sistem Informasi", "Ilmu Komputer", "Teknologi Informasi",
    "Rekayasa Perangkat Lunak", "Informatika", "Ilmu Komunikasi", "Hubungan Internasional",
    "Desain Komunikasi Visual", "Desain Grafis", "Akuntansi", "Manajemen",
    "Administrasi Bisnis", "Administrasi Publik", "Psikologi", "Hukum",
    "Statistika", "Matematika", "Fisika", "Kimia", "Biologi", "Bioteknologi",
    "Sastra Inggris", "Hubungan Masyarakat", "Kesehatan & Keselamatan Kerja (K3)",
    "Teknik Industri", "Teknik Elektro", "Teknik Mesin", "Teknik Kimia",
    "Teknik Sipil", "Teknik Perminyakan", "Teknik Pertambangan", "Teknik Geologi",
    "Teknik Geofisika", "Teknik Kelautan", "Teknik Lingkungan", "Teknik Fisika",
    "Teknik Metalurgi", "Teknik Perkapalan"
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
    
    if req_type in ["image", "stylesheet", "font", "media"]:
        await route.abort()
        return
        
    trackers = [
        "google-analytics", "googletagmanager", "doubleclick", 
        "facebook.net", "hotjar", "ads", "analytics"
    ]
    if any(t in url for t in trackers):
        await route.abort()
        return
        
    await route.continue_()


# Shared lock for safe progress writing
file_write_lock = asyncio.Lock()

async def save_progress(output_path, data_list):
    """Writes list safely using temporary swap file to prevent corruption"""
    async with file_write_lock:
        temp_path = output_path + ".tmp"
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data_list, f, indent=4, ensure_ascii=False)
            os.replace(temp_path, output_path)
        except Exception as e:
            # Silent fallback to avoid worker crash
            pass


async def scrape_detail_worker(context, job_queue, results_list, progress_tracker, output_path):
    """Worker task that processes job detail pages concurrently with 30s timeouts and auto-retry"""
    page = await context.new_page()
    await page.route("**/*", block_resources)
    
    while True:
        try:
            job = job_queue.get_nowait()
        except asyncio.QueueEmpty:
            break

        idx = progress_tracker["current"]
        progress_tracker["current"] += 1
        print(f"    {C_CYAN}[Worker]{C_RESET} [{idx + 1}/{progress_tracker['total']}] Memproses: {job['judul']}...")
        
        success = False
        retries = 2
        
        while retries >= 0 and not success:
            try:
                # 30s timeout to survive server heavy load
                await page.goto(job["detailUrl"], timeout=30000, wait_until="commit")
                
                # Dynamic wait for Location tag (max 3s)
                try:
                    await page.wait_for_selector(".icon--location, .icon-location, i[class*='location']", timeout=3000)
                except:
                    await page.wait_for_timeout(1000)
                
                full_text = await page.evaluate("() => document.body.innerText")
                lines = [l.strip() for l in full_text.split('\n') if l.strip()]
                
                kota = "Tidak tertera"
                industri = "Tidak tertera"
                sektor = "Energy"
                
                loc_el = await page.query_selector(".icon--location, .icon-location, i[class*='location']")
                if loc_el:
                    kota = (await loc_el.evaluate("el => el.parentElement.innerText")).strip()
                
                ind_el = await page.query_selector(".icon--tag, .icon-tag, i[class*='tag'], i[class*='industry']")
                if ind_el:
                    industri = (await ind_el.evaluate("el => el.parentElement.innerText")).strip()
                
                sec_el = await page.query_selector(".icon--briefcase, .icon-briefcase, .icon--bag, .icon-bag, i[class*='briefcase']")
                if sec_el:
                    sektor = (await sec_el.evaluate("el => el.parentElement.innerText")).strip()
                
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
                await save_progress(output_path, results_list)
            except Exception as e:
                retries -= 1
                if retries < 0:
                    print(f"    {C_RED}[Worker] [✘] Gagal memproses {job['judul']} setelah 3 percobaan: {e}{C_RESET}")
                else:
                    await page.wait_for_timeout(2000)
        
        job_queue.task_done()
        
    await page.close()


async def main():
    session_file = "pertamina_session.json"
    output_dir = "JSON BARU"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "loker_data_scraped.json")
    
    # Load existing progress (Resume Mode)
    resume_dict = {}
    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, list):
                    for item in loaded:
                        link = item.get("Link Detail")
                        if link:
                            resume_dict[link] = item
            print(f"{C_GREEN}[*] Resume Mode: Terdeteksi data kemajuan scraping lama. Memuat {len(resume_dict)} lowongan.{C_RESET}")
        except Exception as e:
            print(f"{C_YELLOW}[!] Gagal memuat data lama (mulai baru): {e}{C_RESET}")

    async with async_playwright() as p:
        has_session = os.path.exists(session_file)
        if not has_session:
            print("\n============================================================")
            print(f"{C_BOLD}{C_CYAN}                 INISIALISASI LOGIN PERTAMINA{C_RESET}")
            print("============================================================")
            print("[*] Sesi login tidak ditemukan. Membuka browser visual...")
            
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context()
            page = await context.new_page()
            
            print(f"[*] Menghubungi {START_URL} ...")
            await page.goto(START_URL, timeout=60000)
            
            print(f"\n{C_BOLD}{C_YELLOW}[!] TINDAKAN DIPERLUKAN:{C_RESET}")
            print("    1. Silakan login ke akun Pertamina Anda pada jendela browser.")
            print("    2. Masuk ke halaman daftar lowongan/magang.")
            print("    3. Tekan [ENTER] di terminal ini untuk menyimpan sesi & mulai scraping.")
            
            await asyncio.get_event_loop().run_in_executor(None, input, "\nTekan [ENTER] setelah siap...")
            
            await context.storage_state(path=session_file)
            print(f"{C_GREEN}[+] Sesi login sukses disimpan ke '{session_file}'!{C_RESET}")
        else:
            print(f"{C_BLUE}[*] Menggunakan sesi login tersimpan...{C_RESET}")
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(storage_state=session_file)
            page = await context.new_page()
            print(f"{C_BLUE}[*] Menghubungi {START_URL} ...{C_RESET}")
            try:
                await page.goto(START_URL, timeout=60000, wait_until="domcontentloaded")
                
                # Check for expiration redirects
                current_url = page.url
                is_login_page = "login" in current_url.lower() or await page.query_selector("input[type='password']") or await page.query_selector("button:has-text('Login'), :text('Login'), button:has-text('Masuk'), :text('Masuk')")
                
                if is_login_page:
                    raise Exception("Redirected to login screen")
                
                # Wait up to 15 seconds for job list matching VACANCY_REGEX in page content
                has_jobs = False
                for _ in range(30):
                    content = await page.content()
                    if VACANCY_REGEX.search(content):
                        has_jobs = True
                        break
                    # Break early if we redirected to login during wait
                    if "login" in page.url.lower():
                        break
                    await page.wait_for_timeout(500)
                
                if not has_jobs:
                    raise Exception("No jobs rendered within timeout (session expired)")
                    
            except Exception as e:
                print(f"\n{C_RED}[!] Sesi login kedaluwarsa atau tidak valid ({e})! Menghapus sesi lama...{C_RESET}")
                await page.close()
                await browser.close()
                if os.path.exists(session_file):
                    try:
                        os.remove(session_file)
                    except:
                        pass
                # Recursive call to trigger interactive login
                return await main()
            
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
        # Ensure we are on the correct internship search listing widget page before scanning
        if "bf1c31dc-9341-47ff-ac76-0fa9a30065ac" not in page.url:
            print(f"{C_BLUE}[*] Mengarahkan kembali ke halaman daftar lowongan magang...{C_RESET}")
            await page.goto(START_URL, timeout=60000, wait_until="domcontentloaded")
            # Wait up to 15 seconds for job list matching VACANCY_REGEX in page content
            has_jobs = False
            for _ in range(30):
                content = await page.content()
                if VACANCY_REGEX.search(content):
                    has_jobs = True
                    break
                await page.wait_for_timeout(500)
            if not has_jobs:
                print(f"{C_RED}[!] Peringatan: Tidak dapat mendeteksi lowongan magang setelah mengarahkan halaman.{C_RESET}")
            
        unique_jobs = []
        page_num = 1
        previous_page_ids = set()
        
        print(f"\n{C_BOLD}{C_BLUE}[*] Memulai pemindaian halaman daftar loker...{C_RESET}")
        
        while True:
            print(f"    - Memindai halaman {page_num}...")
            
            # Fetch current items in listing
            job_elements = await page.query_selector_all(".job-item, .card, tr, [class*='card']")
            current_page_ids = set()
            
            for el in job_elements:
                el_html = await el.inner_html()
                match = VACANCY_REGEX.search(el_html)
                if match:
                    vacancy_id = match.group(1)
                    current_page_ids.add(vacancy_id)
                    
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
            
            if not current_page_ids:
                print(f"    {C_YELLOW}- Tidak ditemukan lowongan di halaman ini. Selesai memindai daftar.{C_RESET}")
                break
                
            if current_page_ids == previous_page_ids:
                print(f"    {C_GREEN}- Halaman stagnan (tidak berpindah). Selesai memindai daftar.{C_RESET}")
                break
                
            previous_page_ids = current_page_ids
            
            # Resilient page transition retry loop (up to 3 times, DOM-only without full reloads)
            success_transition = False
            for retry in range(3):
                try:
                    # Evaluate next page button in page context dynamically on each retry
                    next_btn_handle = await page.evaluate_handle("""() => {
                        const isDisabled = (el) => {
                            if (!el) return true;
                            if (el.disabled || el.hasAttribute('disabled') || el.classList.contains('disabled')) return true;
                            if (el.parentElement && el.parentElement.classList.contains('disabled')) return true;
                            return false;
                        };

                        // 1. Try standard next button selectors
                        let btn = document.querySelector('[aria-label="Next"], [aria-label="Next Page"], .next-page, .next, .pagination-next');
                        if (btn && !isDisabled(btn)) return btn;
                        
                        // 2. Try text matching on buttons/links
                        const elements = Array.from(document.querySelectorAll('a, button, li, span'));
                        for (let el of elements) {
                            const txt = el.innerText.trim().toLowerCase();
                            if (txt === 'next' || txt === 'selanjutnya' || txt === '>' || txt === '»') {
                                if (!isDisabled(el)) return el;
                            }
                        }

                        // 3. Fallback: Sibling active page number link
                        const activeEl = document.querySelector('.active, .current, [class*="active"], [class*="current"]');
                        if (activeEl) {
                            const container = activeEl.closest('.pagination, [class*="pagination"], [class*="page-list"]');
                            if (container) {
                                // Find only top-level pagination items to avoid duplicate parent/child matches
                                let items = Array.from(container.querySelectorAll('li'));
                                if (items.length > 0) {
                                    const activeIdx = items.findIndex(item => item === activeEl || item.contains(activeEl));
                                    if (activeIdx !== -1 && items[activeIdx + 1]) {
                                        const nextItem = items[activeIdx + 1];
                                        const clickable = nextItem.querySelector('a, button') || nextItem;
                                        if (clickable && !isDisabled(clickable)) return clickable;
                                    }
                                } else {
                                    let siblings = Array.from(container.querySelectorAll('a, button'));
                                    const activeIdx = siblings.findIndex(item => item === activeEl || item.contains(activeEl));
                                    if (activeIdx !== -1 && siblings[activeIdx + 1]) {
                                        const nextLink = siblings[activeIdx + 1];
                                        if (nextLink && !isDisabled(nextLink)) return nextLink;
                                    }
                                }
                            }
                        }
                        return null;
                    }""")
                    
                    next_btn = next_btn_handle.as_element()
                    if not next_btn:
                        break
                        
                    is_disabled = await next_btn.evaluate("el => el.disabled || el.hasAttribute('disabled') || el.classList.contains('disabled')")
                    if is_disabled:
                        if retry == 0:
                            print(f"    {C_GREEN}- Sudah di halaman terakhir (tombol disabled).{C_RESET}")
                        break
                        
                    # Click the next button
                    await next_btn.click(timeout=15000)
                    
                    # Wait up to 30 seconds for the page transition to complete
                    has_transitioned = False
                    target_page_str = str(page_num + 1)
                    
                    for w in range(60): # 60 * 500ms = 30s
                        # Check Method 1: Pagination Active Element
                        active_page_num = await page.evaluate("""() => {
                            const activeEl = document.querySelector('.pagination .active, .pagination .current, [class*="pagination"] [class*="active"], [class*="pagination"] [class*="current"], .ngx-pagination .current');
                            if (!activeEl) return null;
                            const match = activeEl.innerText.match(/\\d+/);
                            return match ? match[0] : null;
                        }""")
                        
                        if active_page_num == target_page_str:
                            has_transitioned = True
                            break
                            
                        # Check Method 2: Card ID Changes
                        new_cards = await page.query_selector_all(".job-item, .card, tr, [class*='card']")
                        if new_cards:
                            new_ids = set()
                            for c in new_cards:
                                html = await c.inner_html()
                                match = VACANCY_REGEX.search(html)
                                if match:
                                    new_ids.add(match.group(1))
                            if new_ids and new_ids != previous_page_ids:
                                has_transitioned = True
                                break
                                
                        await page.wait_for_timeout(500)
                        
                    if has_transitioned:
                        page_num += 1
                        success_transition = True
                        break
                    else:
                        print(f"    {C_YELLOW}[!] Transisi ke halaman {page_num + 1} belum ter-render (Mencoba klik ulang {retry+1}/3)...{C_RESET}")
                        await page.wait_for_timeout(3000)
                except Exception as ex:
                    print(f"    {C_RED}[!] Gagal transisi ke halaman {page_num + 1} ({ex}). Mencoba klik ulang...{C_RESET}")
                    await page.wait_for_timeout(3000)
            
            if not success_transition:
                print(f"    {C_RED}[✘] Selesai memindai (tidak ada respon transisi halaman setelah 3 percobaan).{C_RESET}")
                break
                
        print(f"\n{C_GREEN}[+] Sukses mendeteksi total {len(unique_jobs)} lowongan magang.{C_RESET}")
        await page.close()
        
        if not unique_jobs:
            print(f"{C_RED}[!] Peringatan: Tidak ada lowongan yang ditemukan. Mematikan skraper...{C_RESET}")
            await browser.close()
            return
            
        print(f"\n{C_BOLD}{C_BLUE}[*] Memulai Fase 2: Mengambil detail lowongan secara paralel (concurrency=8)...{C_RESET}")
        hasil_scraping = []
        
        # Load and queue only items that haven't been scraped yet
        job_queue = asyncio.Queue()
        skipped_count = 0
        
        for job in unique_jobs:
            if job["detailUrl"] in resume_dict:
                hasil_scraping.append(resume_dict[job["detailUrl"]])
                skipped_count += 1
            else:
                await job_queue.put(job)
                
        if skipped_count > 0:
            print(f"{C_GREEN}[+] Resume Mode: Melewati {skipped_count} lowongan yang sudah di-scrape sebelumnya.{C_RESET}")
            # Save the loaded items to progress file immediately
            await save_progress(output_path, hasil_scraping)
            
        remaining_count = len(unique_jobs) - skipped_count
        if remaining_count == 0:
            print(f"{C_BOLD}{C_GREEN}[+] Seluruh lowongan sudah ter-scrape sebelumnya! Proses selesai.{C_RESET}")
            await browser.close()
            return
            
        progress_tracker = {
            "current": skipped_count,
            "total": len(unique_jobs)
        }
        
        # We will use 8 concurrent worker tasks (gentler on slow servers, but super fast)
        concurrency = 8
        workers = []
        for i in range(concurrency):
            task = asyncio.create_task(
                scrape_detail_worker(context, job_queue, hasil_scraping, progress_tracker, output_path)
            )
            workers.append(task)
            
        start_time = time.time()
        await asyncio.gather(*workers)
        end_time = time.time()
        
        await browser.close()
        
        duration = end_time - start_time
        print("=" * 65)
        print(f"{C_BOLD}{C_GREEN}[+] SELESAI: Sukses memproses {len(hasil_scraping)} lowongan dalam {duration:.1f} detik.{C_RESET}")
        print(f"{C_BOLD}{C_GREEN}[+] Rata-rata: {duration/max(1, remaining_count):.2f} detik per lowongan baru.{C_RESET}")
        print(f"{C_BOLD}{C_GREEN}[+] Output final disimpan di: {output_path}{C_RESET}")
        print("=" * 65)

if __name__ == "__main__":
    asyncio.run(main())

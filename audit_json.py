import os
import glob
import csv
import json

base_dir = "/Users/Luthfi/Project/PT. Teknalogi Transformasi Digital/PertaminaWebCareer"
csv_folder = os.path.join(base_dir, "Folder Pertamina New BGT")
json_folder = os.path.join(base_dir, "JSON NEW")
react_json_path = os.path.join(base_dir, "web-app", "src", "data", "loker_data.json")
web_json_path = os.path.join(base_dir, "web", "loker_data.json")

# --- 1. LOAD CSV DATA AS REFERENSI / GROUND TRUTH FOR STATIC FIELDS ---
print(f"Scanning for CSV files in: {csv_folder}")
csv_files = glob.glob(os.path.join(csv_folder, "loker_magang_pertamina_semua*.csv"))
print(f"Found {len(csv_files)} CSV reference files.")

csv_lookup = {}
for csv_file in csv_files:
    with open(csv_file, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            link = (row.get("Link Detail") or "").strip()
            if link:
                csv_lookup[link] = {
                    "Kota": (row.get("Kota") or "Tidak tertera").strip(),
                    "Industri": (row.get("Industri") or "Tidak tertera").strip(),
                    "Sektor": (row.get("Sektor") or "Tidak tertera").strip(),
                    "Pendidikan": (row.get("Pendidikan") or "Tidak tertera").strip(),
                    "Jurusan": (row.get("Jurusan") or "").strip()
                }

print(f"Loaded {len(csv_lookup)} unique reference positions from CSV files.")

# --- 2. PROCESS NEW JSON FILES (CONTAINING LATEST APPLICANTS/KUOTA COUNTS) ---
print(f"\nScanning for JSON files in: {json_folder}")
json_files = glob.glob(os.path.join(json_folder, "loker_data*.json"))
print(f"Found {len(json_files)} JSON files.")

all_records = []
seen_links = set()
dirty_jurusan_count = 0
patched_kota_count = 0
patched_industri_count = 0

# Helper function to clean Jurusan field from script injection and requirement texts
import re

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
    "git", "coding", "software", "application", "cloud", "java", "python", "javascript", 
    "html", "css", "sql", "c++", "c#", "php", "golang", "rust", "react", "node", "aws", 
    "docker", "kubernetes", "figma", "ui/ux", "hardskill", "softskill", "skills", 
    "knowledge", "ability", "capability", "experience", "understanding", "interest", 
    "passion", "adaptability", "resilience", "adaptive", "writing", "listening", 
    "thinking", "solving", "oriented", "project management", "stakeholder management", 
    "data management", "waste management", "emergency response"
]

def clean_jurusan(jurusan_str):
    global dirty_jurusan_count
    if not jurusan_str:
        return "Semua Jurusan / Tidak Tertera"
    
    dirty_indicator = "$(document).ready"
    if dirty_indicator in jurusan_str:
        dirty_jurusan_count += 1
        idx = jurusan_str.find(dirty_indicator)
        jurusan_str = jurusan_str[:idx]
        
    # Insert space at camelCase boundary (e.g. EkonomiMenguasai -> Ekonomi, Menguasai)
    cleaned = re.sub(r'([a-z])([A-Z])', r'\1, \2', jurusan_str)
    
    # Pre-split normalization for K3 variations
    cleaned = re.sub(r'keselamatan\s+dan\s+kesehatan\s+kerja(?:\s*\(k3\))?', 'Kesehatan & Keselamatan Kerja (K3)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'keselamatan\s+kesehatan\s+kerja(?:\s*\(k3\))?', 'Kesehatan & Keselamatan Kerja (K3)', cleaned, flags=re.IGNORECASE)
    
    # Split by common separators
    tokens = re.split(r',|;|\bdan\b|\bserta\b', cleaned, flags=re.IGNORECASE)
    
    MAJOR_CORRECTIONS = {
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
        # Clean leading/trailing non-alphanumeric chars except parenthesis
        token = re.sub(r'^[^a-zA-Z0-9\(]+|[^a-zA-Z0-9\)]+$', '', token).strip()
        if not token or len(token) <= 1:
            continue
        
        # Check if this token contains any requirement keywords
        token_lower = token.lower()
        has_keyword = False
        for kw in REQUIREMENT_KEYWORDS:
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, token_lower):
                has_keyword = True
                break
        
        if has_keyword:
            break
            
        # Apply corrections with word boundary match where appropriate
        # Apply corrections with word boundary match where appropriate (longest typo first to prevent nesting)
        for typo, correction in sorted(MAJOR_CORRECTIONS.items(), key=lambda x: len(x[0]), reverse=True):
            if correction.lower() in token.lower():
                continue
            left_boundary = r'\b' if typo[0].isalnum() else ''
            right_boundary = r'\b' if typo[-1].isalnum() else ''
            pattern = left_boundary + re.escape(typo) + right_boundary
            if re.search(pattern, token_lower):
                token = re.sub(pattern, correction, token, flags=re.IGNORECASE)
                token_lower = token.lower()
                
        token = re.sub(r'\s+', ' ', token).strip()
        token = capitalize_major(token)
        valid_majors.append(token)
        
    if not valid_majors:
        return "Semua Jurusan / Tidak Tertera"
        
    final_str = ", ".join(valid_majors).strip().rstrip(",. ")
    return final_str if final_str else "Semua Jurusan / Tidak Tertera"

# Helper function to clean and patch Kota field
def clean_kota(title, current_kota):
    global patched_kota_count
    kota = current_kota.strip()
    if not kota or kota == "Tidak tertera" or kota == "-":
        patched_kota_count += 1
        # Apply the location patching heuristics
        if "Kamojang" in title:
            return "Bandung"
        elif "Ulubelu" in title:
            return "Kabupaten Tanggamus (Lampung)"
        elif "Lumut Balai" in title:
            return "Kabupaten Muara Enim (Sumatera Selatan)"
        elif "Cilacap" in title:
            return "Kabupaten Cilacap"
        elif "Balongan" in title:
            return "Kabupaten Indramayu"
        elif "Aviasi" in title:
            return "Kota Administrasi Jakarta Pusat"
        elif "S&D JBB" in title:
            return "Kota Administrasi Jakarta Pusat"
        elif "Legal Counsel" in title:
            return "Kota Administrasi Jakarta Pusat"
        elif "Manager Engineering" in title:
            return "Kota Administrasi Jakarta Pusat"
        elif "Laboratory" in title:
            return "Bandung"
        elif "PT Pertamina (Persero)" in title:
            return "Kota Administrasi Jakarta Pusat"
        elif "Pertamina Patra Niaga" in title and "Jakarta" in title:
            return "Kota Administrasi Jakarta Pusat"
    
    # Clean up Jakarta names
    if "Jakarta Pusat" in kota:
        return "Kota Administrasi Jakarta Pusat"
    if "Jakarta Barat" in kota:
        return "Kota Administrasi Jakarta Barat"
    if "Jakarta Utara" in kota:
        return "Kota Administrasi Jakarta Utara"
    if "Jakarta Timur" in kota:
        return "Kota Administrasi Jakarta Timur"
    if "Jakarta Selatan" in kota:
        return "Kota Administrasi Jakarta Selatan"
        
    return kota

for json_file in json_files:
    filename = os.path.basename(json_file)
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                link = item.get("Link Detail", "").strip()
                if not link:
                    continue
                
                # Deduplicate by detail link
                if link in seen_links:
                    continue
                seen_links.add(link)
                
                title = item.get("Judul Lowongan", "").strip()
                
                # Extract clean Perusahaan name from Title
                parts = title.split(" - ")
                company = parts[1].strip() if len(parts) > 1 else item.get("Perusahaan", "PT Pertamina").strip()
                
                # Retrieve from CSV reference lookup if available
                csv_ref = csv_lookup.get(link, {})
                
                # Location (Kota): Prefer CSV reference if it is valid
                ref_kota = csv_ref.get("Kota", "Tidak tertera")
                raw_json_kota = item.get("Kota", "Tidak tertera")
                kota = ref_kota if ref_kota != "Tidak tertera" else raw_json_kota
                kota = clean_kota(title, kota)
                
                # Industri: Prefer CSV reference if it is valid
                ref_industri = csv_ref.get("Industri", "Tidak tertera")
                raw_json_industri = item.get("Industri", "Tidak tertera")
                industri = ref_industri if ref_industri != "Tidak tertera" else raw_json_industri
                if industri == "Tidak tertera":
                    patched_industri_count += 1
                    # Basic fallback heuristics
                    if "Finance" in title or "Accounting" in title or "Tax" in title:
                        industri = "Oil & Energy"
                    elif "IT" in title or "Digital" in title or "Software" in title:
                        industri = "Oil & Energy"
                    else:
                        industri = "Oil & Energy" # Pertamina default
                
                # Sektor: Prefer CSV reference
                ref_sektor = csv_ref.get("Sektor", "Energy")
                sektor = ref_sektor if ref_sektor != "Tidak tertera" else item.get("Sektor", "Energy")
                
                # Pendidikan
                ref_edu = csv_ref.get("Pendidikan", "Tidak tertera")
                pendidikan = ref_edu if ref_edu != "Tidak tertera" else item.get("Pendidikan", "Tidak tertera")
                
                # Jurusan (prioritize clean reference from CSV)
                ref_jur = csv_ref.get("Jurusan", "").strip()
                is_ref_clean = ref_jur and not (len(ref_jur) > 80 or "Menguasai" in ref_jur or "Mampu" in ref_jur or "Memiliki" in ref_jur or "Detail Oriented" in ref_jur)
                if is_ref_clean:
                    jurusan = clean_jurusan(ref_jur)
                else:
                    jurusan = clean_jurusan(item.get("Jurusan", ""))
                
                # Make sure Kuota and Pelamar are ints (take the latest numbers from JSON)
                try:
                    kuota = int(float(str(item.get("Kuota", 1))))
                except:
                    kuota = 1
                try:
                    pelamar = int(float(str(item.get("Pelamar", 0))))
                except:
                    pelamar = 0
                
                all_records.append({
                    "Judul Lowongan": title,
                    "Perusahaan": company,
                    "Kota": kota,
                    "Industri": industri,
                    "Sektor": sektor,
                    "Pendidikan": pendidikan,
                    "Jurusan": jurusan,
                    "Link Detail": link,
                    "Kuota": kuota,
                    "Pelamar": pelamar
                })
    except Exception as e:
        print(f"Error reading {filename}: {e}")

print("\n--- HYBRID SCRAPING AUDIT RESULT ---")
print(f"Total Unique Records Merged: {len(all_records)}")
print(f"Cleaned JQuery-injected Jurusan rows: {dirty_jurusan_count}")
print(f"Patched Missing Kota rows: {patched_kota_count}")
print(f"Patched Missing Industri rows: {patched_industri_count}")

# Save to React app data
os.makedirs(os.path.dirname(react_json_path), exist_ok=True)
with open(react_json_path, "w", encoding="utf-8") as f:
    json.dump(all_records, f, indent=4, ensure_ascii=False)
print(f"Successfully updated React app JSON database: {react_json_path}")

# Save to legacy web folder
os.makedirs(os.path.dirname(web_json_path), exist_ok=True)
with open(web_json_path, "w", encoding="utf-8") as f:
    json.dump(all_records, f, indent=4, ensure_ascii=False)
print(f"Successfully updated legacy web JSON database: {web_json_path}")

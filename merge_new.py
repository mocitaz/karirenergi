import os
import glob
import json

base_dir = "/Users/Luthfi/Project/PT. Teknalogi Transformasi Digital/PertaminaWebCareer"
json_new_dir = os.path.join(base_dir, "NEW")
react_json_path = os.path.join(base_dir, "web-app", "src", "data", "loker_data.json")
web_json_path = os.path.join(base_dir, "web", "loker_data.json")

print("Loading existing database...")
existing_records = []
if os.path.exists(react_json_path):
    with open(react_json_path, "r", encoding="utf-8") as f:
        existing_records = json.load(f)

records_by_link = {}
for r in existing_records:
    link = r.get("Link Detail")
    if link:
        records_by_link[link] = r

print(f"Loaded {len(records_by_link)} existing jobs.")

# Scan for all JSON files in NEW
new_json_files = glob.glob(os.path.join(json_new_dir, "loker_data*.json"))
print(f"Found {len(new_json_files)} JSON files in NEW to process.")

new_jobs_added = 0
existing_jobs_updated = 0

def is_valid(val):
    if not val:
        return False
    v = val.strip().lower()
    return v not in ["", "-", "null", "tidak tertera", "semua jurusan / tidak tertera"]

for filepath in new_json_files:
    with open(filepath, "r", encoding="utf-8") as f:
        try:
            items = json.load(f)
            if not isinstance(items, list):
                items = [items]
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            continue

        for item in items:
            title = (item.get("Judul Lowongan") or "").strip()
            if not title:
                continue

            link = (item.get("Link Detail") or "").strip()
            if not link:
                continue

            # Extract subsidiary from Judul Lowongan
            perusahaan = "PT Pertamina"
            parts = title.split(" - ")
            if len(parts) > 1:
                perusahaan = parts[1].strip()

            # Parse Kuota and Pelamar
            try:
                kuota_val = int(float(str(item.get("Kuota", 1)).strip()))
            except:
                kuota_val = 1

            try:
                pelamar_val = int(float(str(item.get("Pelamar", 0)).strip()))
            except:
                pelamar_val = 0

            # Raw values
            kota = (item.get("Kota") or "Tidak tertera").strip()
            industri = (item.get("Industri") or "Tidak tertera").strip()
            sektor = (item.get("Sektor") or "Tidak tertera").strip()
            pendidikan = (item.get("Pendidikan") or "Tidak tertera").strip()
            jurusan = (item.get("Jurusan") or "Semua Jurusan / Tidak tertera").strip()
            job_desc = (item.get("Deskripsi Pekerjaan") or "Tidak tertera").strip()
            reqs = (item.get("Persyaratan") or "Tidak tertera").strip()

            if link in records_by_link:
                # Merge Protection: Keep existing valid descriptors if the new one is invalid/missing
                existing = records_by_link[link]
                
                # Unconditional update for metrics
                existing["Kuota"] = kuota_val
                existing["Pelamar"] = pelamar_val
                existing["Judul Lowongan"] = title
                existing["Perusahaan"] = perusahaan
                
                # Protected updates
                if is_valid(kota) or not is_valid(existing.get("Kota")):
                    existing["Kota"] = kota
                if is_valid(industri) or not is_valid(existing.get("Industri")):
                    existing["Industri"] = industri
                if is_valid(sektor) or not is_valid(existing.get("Sektor")):
                    existing["Sektor"] = sektor
                if is_valid(pendidikan) or not is_valid(existing.get("Pendidikan")):
                    existing["Pendidikan"] = pendidikan
                if is_valid(jurusan) or not is_valid(existing.get("Jurusan")):
                    existing["Jurusan"] = jurusan
                if is_valid(job_desc) or not is_valid(existing.get("Deskripsi Pekerjaan")):
                    existing["Deskripsi Pekerjaan"] = job_desc
                if is_valid(reqs) or not is_valid(existing.get("Persyaratan")):
                    existing["Persyaratan"] = reqs
                
                if "tanggal_ditemukan" not in existing:
                    existing["tanggal_ditemukan"] = "2026-07-04"
                existing_jobs_updated += 1
            else:
                # New record
                new_record = {
                    "Judul Lowongan": title,
                    "Perusahaan": perusahaan,
                    "Kota": kota,
                    "Industri": industri,
                    "Sektor": sektor,
                    "Pendidikan": pendidikan,
                    "Jurusan": jurusan,
                    "Link Detail": link,
                    "Kuota": kuota_val,
                    "Pelamar": pelamar_val,
                    "Deskripsi Pekerjaan": job_desc,
                    "Persyaratan": reqs,
                    "tanggal_ditemukan": "2026-07-04"
                }
                records_by_link[link] = new_record
                new_jobs_added += 1

merged_records = list(records_by_link.values())

for out_path in [react_json_path, web_json_path]:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(merged_records, f, indent=4, ensure_ascii=False)

print(f"Merge Complete:")
print(f"- Total jobs in DB: {len(merged_records)}")
print(f"- Updated existing jobs: {existing_jobs_updated}")
print(f"- Added new jobs: {new_jobs_added}")

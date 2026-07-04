import os
import glob
import json
from datetime import datetime

base_dir = "/Users/Luthfi/Project/PT. Teknalogi Transformasi Digital/PertaminaWebCareer"
jsonnewnew_dir = os.path.join(base_dir, "JSONNEWNEW")
react_json_path = os.path.join(base_dir, "web-app", "src", "data", "loker_data.json")
web_json_path = os.path.join(base_dir, "web", "loker_data.json")

print(f"Loading existing data from React web-app...")
existing_records = []
if os.path.exists(react_json_path):
    with open(react_json_path, "r", encoding="utf-8") as f:
        try:
            existing_records = json.load(f)
        except Exception as e:
            print(f"Error loading existing JSON: {e}")

# Index existing records by Link Detail for quick lookup
records_by_link = {}
for record in existing_records:
    link = record.get("Link Detail")
    if link:
        # Keep it indexed by Link Detail
        records_by_link[link] = record

print(f"Found {len(records_by_link)} existing jobs in database.")

# Scan for all JSON files in JSONNEWNEW
new_json_files = glob.glob(os.path.join(jsonnewnew_dir, "loker_data*.json"))
print(f"Found {len(new_json_files)} new JSON files in JSONNEWNEW/ to merge.")

new_jobs_added = 0
existing_jobs_updated = 0

for filepath in new_json_files:
    print(f"Processing: {os.path.basename(filepath)}")
    with open(filepath, "r", encoding="utf-8") as f:
        try:
            items = json.load(f)
            if not isinstance(items, list):
                # If it's a single dict, convert to list
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
                candidate = parts[1].strip()
                perusahaan = candidate

            # Parse Kuota and Pelamar
            try:
                kuota_val = int(float(str(item.get("Kuota", 1)).strip()))
            except:
                kuota_val = 1

            try:
                pelamar_val = int(float(str(item.get("Pelamar", 0)).strip()))
            except:
                pelamar_val = 0

            # Get clean values
            kota = (item.get("Kota") or "Tidak tertera").strip()
            industri = (item.get("Industri") or "Tidak tertera").strip()
            sektor = (item.get("Sektor") or "Tidak tertera").strip()
            pendidikan = (item.get("Pendidikan") or "Tidak tertera").strip()
            jurusan = (item.get("Jurusan") or "Semua Jurusan / Tidak tertera").strip()
            job_desc = (item.get("Deskripsi Pekerjaan") or "Tidak tertera").strip()
            reqs = (item.get("Persyaratan") or "Tidak tertera").strip()

            # If job already exists, update its fields
            if link in records_by_link:
                existing_record = records_by_link[link]
                existing_record["Judul Lowongan"] = title
                existing_record["Perusahaan"] = perusahaan
                existing_record["Kota"] = kota
                existing_record["Industri"] = industri
                existing_record["Sektor"] = sektor
                existing_record["Pendidikan"] = pendidikan
                existing_record["Jurusan"] = jurusan
                existing_record["Kuota"] = kuota_val
                existing_record["Pelamar"] = pelamar_val
                existing_record["Deskripsi Pekerjaan"] = job_desc
                existing_record["Persyaratan"] = reqs
                # Keep original "tanggal_ditemukan", or set to today if not present
                if "tanggal_ditemukan" not in existing_record:
                    existing_record["tanggal_ditemukan"] = "2026-07-04"
                existing_jobs_updated += 1
            else:
                # Add new job
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

# Write back to web-app and legacy folder
for out_path in [react_json_path, web_json_path]:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(merged_records, f, indent=4, ensure_ascii=False)

print(f"Successfully merged data from JSONNEWNEW!")
print(f"- Total jobs now in database: {len(merged_records)}")
print(f"- Existing jobs updated with new quantities: {existing_jobs_updated}")
print(f"- New jobs added: {new_jobs_added}")

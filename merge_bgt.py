import os
import glob
import csv
import json

base_dir = "/Users/Luthfi/Project/PT. Teknalogi Transformasi Digital/PertaminaWebCareer"
csv_folder = os.path.join(base_dir, "Folder Pertamina New BGT")
react_json_path = os.path.join(base_dir, "web-app", "src", "data", "loker_data.json")
web_json_path = os.path.join(base_dir, "web", "loker_data.json")

print(f"Scanning for CSV files in: {csv_folder}")
csv_files = glob.glob(os.path.join(csv_folder, "loker_magang_pertamina_semua*.csv"))
# Sort files numerically if possible to maintain order
def get_num(filename):
    try:
        # Extract number between parenthesis
        parts = filename.split("(")
        if len(parts) > 1:
            return int(parts[1].split(")")[0])
    except Exception:
        pass
    return 999

csv_files.sort(key=get_num)
print(f"Found {len(csv_files)} CSV files to merge.")

records = []
seen_links = set()

for csv_file in csv_files:
    print(f"Processing: {os.path.basename(csv_file)}")
    with open(csv_file, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = (row.get("Judul Lowongan") or "").strip()
            if not title:
                continue

            link = (row.get("Link Detail") or "").strip()
            # Deduplicate by link if necessary, or just append
            if link in seen_links:
                continue
            seen_links.add(link)

            # Extract subsidiary from Judul Lowongan
            perusahaan = "PT Pertamina"
            parts = title.split(" - ")
            if len(parts) > 1:
                candidate = parts[1].strip()
                perusahaan = candidate

            # Parse Kuota
            kuota_raw = row.get("Kuota")
            kuota_val = None
            if kuota_raw is not None:
                try:
                    kuota_val = int(float(str(kuota_raw).strip()))
                except ValueError:
                    pass

            # Parse Pelamar
            pelamar_raw = row.get("Pelamar")
            pelamar_val = None
            if pelamar_raw is not None:
                try:
                    pelamar_val = int(float(str(pelamar_raw).strip()))
                except ValueError:
                    pass

            # Parse and patch Kota
            kota = (row.get("Kota") or "Tidak tertera").strip()
            if kota == "Tidak tertera" or kota == "-" or not kota:
                if "Kamojang" in title:
                    kota = "Bandung"
                elif "Ulubelu" in title:
                    kota = "Kabupaten Tanggamus (Lampung)"
                elif "Lumut Balai" in title:
                    kota = "Kabupaten Muara Enim (Sumatera Selatan)"
                elif "Cilacap" in title:
                    kota = "Kabupaten Cilacap"
                elif "Balongan" in title:
                    kota = "Kabupaten Indramayu"
                elif "Aviasi" in title:
                    kota = "Kota Administrasi Jakarta Pusat"
                elif "S&D JBB" in title:
                    kota = "Kota Administrasi Jakarta Pusat"
                elif "Legal Counsel" in title:
                    kota = "Kota Administrasi Jakarta Pusat"
                elif "Manager Engineering" in title:
                    kota = "Kota Administrasi Jakarta Pusat"
                elif "Laboratory" in title:
                    kota = "Bandung"

            records.append({
                "Judul Lowongan": title,
                "Perusahaan": perusahaan,
                "Kota": kota,
                "Industri": (row.get("Industri") or "Tidak tertera").strip(),
                "Sektor": (row.get("Sektor") or "Tidak tertera").strip(),
                "Pendidikan": (row.get("Pendidikan") or "Tidak tertera").strip(),
                "Jurusan": (row.get("Jurusan") or "Semua Jurusan / Tidak tertera").strip(),
                "Link Detail": link,
                "Kuota": kuota_val,
                "Pelamar": pelamar_val
            })

# Save to React app data
os.makedirs(os.path.dirname(react_json_path), exist_ok=True)
with open(react_json_path, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=4, ensure_ascii=False)

# Save to legacy web folder
os.makedirs(os.path.dirname(web_json_path), exist_ok=True)
with open(web_json_path, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=4, ensure_ascii=False)

print(f"Successfully merged {len(records)} records into JSON.")

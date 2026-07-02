import os
import pandas as pd
import json

# Define paths
base_dir = "/Users/Luthfi/Project/PT. Teknalogi Transformasi Digital/PertaminaWebCareer"
excel_path = os.path.join(base_dir, "Folder Pertamina Fukk", "loker_magang_pertamina_page_1-40.xlsx")
json_output_path = os.path.join(base_dir, "web", "loker_data.json")

print(f"Reading Excel from: {excel_path}")
if not os.path.exists(excel_path):
    print("Error: Excel file not found!")
    exit(1)

# Read excel sheet
df_excel = pd.read_excel(excel_path)
df_excel = df_excel.fillna("Tidak tertera")

records = []
for _, row in df_excel.iterrows():
    title = str(row.get("Judul Lowongan", "")).strip()
    
    # Ekstrak nama anak perusahaan/subsidiary dari Judul Lowongan
    # Contoh: "INTERNSHIP 2026 - PT Pertamina Patra Niaga - Aviasi"
    # Di-split dengan " - " menghasilkan part[1] = "PT Pertamina Patra Niaga"
    perusahaan = "PT Pertamina"
    parts = title.split(" - ")
    if len(parts) > 1:
        candidate = parts[1].strip()
        perusahaan = candidate
        
    kuota = row.get("Kuota")
    pelamar = row.get("Pelamar")
    
    kuota_val = None
    if kuota is not None and not pd.isna(kuota) and str(kuota).strip() != "Tidak tertera":
        try:
            kuota_val = int(float(str(kuota).strip()))
        except ValueError:
            pass
            
    pelamar_val = None
    if pelamar is not None and not pd.isna(pelamar) and str(pelamar).strip() != "Tidak tertera":
        try:
            pelamar_val = int(float(str(pelamar).strip()))
        except ValueError:
            pass

    records.append({
        "Judul Lowongan": title,
        "Perusahaan": perusahaan,
        "Kota": str(row.get("Kota", "Tidak tertera")).strip(),
        "Industri": str(row.get("Industri", "Tidak tertera")).strip(),
        "Sektor": str(row.get("Sektor", "Tidak tertera")).strip(),
        "Pendidikan": str(row.get("Pendidikan", "Tidak tertera")).strip(),
        "Jurusan": str(row.get("Jurusan", "Semua Jurusan / Tidak tertera")).strip(),
        "Link Detail": str(row.get("Link Detail", "")).strip(),
        "Kuota": kuota_val,
        "Pelamar": pelamar_val
    })

# Ensure output directory exists
os.makedirs(os.path.dirname(json_output_path), exist_ok=True)

# Write to JSON file in web directory
with open(json_output_path, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=4, ensure_ascii=False)

# Also write directly to the web-app src data directory
react_json_output_path = os.path.join(base_dir, "web-app", "src", "data", "loker_data.json")
os.makedirs(os.path.dirname(react_json_output_path), exist_ok=True)
with open(react_json_output_path, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=4, ensure_ascii=False)

print(f"Successfully processed {len(records)} records and updated both JSON destinations.")

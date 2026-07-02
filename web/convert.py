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
        
    records.append({
        "Judul Lowongan": title,
        "Perusahaan": perusahaan,
        "Kota": str(row.get("Kota", "Tidak tertera")).strip(),
        "Industri": str(row.get("Industri", "Tidak tertera")).strip(),
        "Sektor": str(row.get("Sektor", "Tidak tertera")).strip(),
        "Pendidikan": str(row.get("Pendidikan", "Tidak tertera")).strip(),
        "Jurusan": str(row.get("Jurusan", "Semua Jurusan / Tidak tertera")).strip(),
        "Link Detail": str(row.get("Link Detail", "")).strip()
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

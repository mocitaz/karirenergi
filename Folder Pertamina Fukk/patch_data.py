import os
import pandas as pd

# Paths
base_dir = "/Users/Luthfi/Project/PT. Teknalogi Transformasi Digital/PertaminaWebCareer"
excel_path = os.path.join(base_dir, "Folder Pertamina Fukk", "loker_magang_pertamina_page_1-40.xlsx")

if not os.path.exists(excel_path):
    print("Excel file not found!")
    exit(1)

# Read the excel sheet
df = pd.read_excel(excel_path)

# Count how many we are patching
patched_count = 0

# Apply patching rules
for idx, row in df.iterrows():
    city = str(row.get("Kota", "")).strip()
    title = str(row.get("Judul Lowongan", "")).strip()
    
    if city == "Tidak tertera" or pd.isna(row.get("Kota")):
        new_city = None
        
        if "Kamojang" in title:
            new_city = "Bandung"
        elif "Ulubelu" in title:
            new_city = "Kabupaten Tanggamus (Lampung)"
        elif "Lumut Balai" in title:
            new_city = "Kabupaten Muara Enim (Sumatera Selatan)"
        elif "Cilacap" in title:
            new_city = "Kabupaten Cilacap"
        elif "Balongan" in title:
            new_city = "Kabupaten Indramayu"
        elif "Aviasi" in title:
            new_city = "Kota Administrasi Jakarta Pusat"
        elif "S&D JBB" in title:
            new_city = "Kota Administrasi Jakarta Pusat"
        elif "Legal Counsel" in title:
            new_city = "Kota Administrasi Jakarta Pusat"
        elif "Manager Engineering" in title:
            new_city = "Kota Administrasi Jakarta Pusat"
        elif "Laboratory" in title:
            # Let's map laboratory to Kamojang/Bandung or keep it
            new_city = "Bandung"
            
        if new_city:
            df.at[idx, "Kota"] = new_city
            patched_count += 1
            print(f"Patched: '{title}' -> {new_city}")

# Save the patched excel back
df.to_excel(excel_path, index=False)
print(f"\nSuccessfully patched {patched_count} cities in Excel file.")

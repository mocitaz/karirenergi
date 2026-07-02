from PIL import Image

# Open the source logo image
img_path = "public/image.png"
output_path = "public/logo.png"

print(f"Loading logo from: {img_path}")
img = Image.open(img_path).convert("RGBA")
datas = img.getdata()

new_data = []
# Threshold for white background detection
# Anything where R, G, B are all above 240 is considered background
threshold = 240

for item in datas:
    r, g, b, a = item
    if r > threshold and g > threshold and b > threshold:
        new_data.append((255, 255, 255, 0)) # Make transparent
    else:
        new_data.append((r, g, b, 255)) # Keep original

img.putdata(new_data)

# Auto crop to bounding box of non-transparent pixels
bbox = img.getbbox()
if bbox:
    img_cropped = img.crop(bbox)
    # Add a tiny padding (e.g., 5px) around the cropped logo to avoid cut-off edges
    padding = 10
    padded_img = Image.new("RGBA", (img_cropped.width + padding * 2, img_cropped.height + padding * 2), (255, 255, 255, 0))
    padded_img.paste(img_cropped, (padding, padding))
    padded_img.save(output_path, "PNG")
    print(f"Saved cropped, transparent logo to: {output_path} (Size: {padded_img.size})")
else:
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to: {output_path} (No bounding box found)")

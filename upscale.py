from PIL import Image, ImageEnhance, ImageFilter
import glob
import os

files = glob.glob('frontend/public/assets/themes/theme*.jpg')
for file in files:
    img = Image.open(file)
    # Target size: scale keeping aspect ratio, making the smaller dimension at least 2000
    width, height = img.size
    ratio = max(2000.0 / width, 2000.0 / height)
    new_size = (int(width * ratio), int(height * ratio))
    
    img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    # Mild sharpening
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    
    # Mild contrast boost
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.1)
    
    img.save(file, quality=95)
    print(f"Upscaled {file} to {img.size}")

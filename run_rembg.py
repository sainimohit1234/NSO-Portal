from rembg import remove
from PIL import Image

input_path = '/Users/deepsri/.gemini/antigravity-ide/brain/9875c6ee-e42b-4f7d-84a2-009f175b5a0b/media__1783421666045.jpg'
output_path = 'frontend/public/assets/central_cup.png'

input_img = Image.open(input_path)
output_img = remove(input_img)
output_img.save(output_path)

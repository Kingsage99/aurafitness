from PIL import Image
import glob
import os

MEDALS_DIR = 'public/medals'
PAD = 8  # small uniform breathing-room margin kept around the trimmed content

if __name__ == '__main__':
    for path in glob.glob(f'{MEDALS_DIR}/*.png'):
        img = Image.open(path).convert('RGBA')
        bbox = img.getbbox()
        if not bbox:
            continue
        l, t, r, b = bbox
        l = max(0, l - PAD)
        t = max(0, t - PAD)
        r = min(img.width, r + PAD)
        b = min(img.height, b + PAD)
        cropped = img.crop((l, t, r, b))
        cropped.save(path)
        print(f'{os.path.basename(path)}: {img.size} -> {cropped.size}')

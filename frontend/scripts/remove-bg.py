from PIL import Image
from pathlib import Path

img_path = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'architectural_stack_3d.png'
backup_path = img_path.with_suffix('.orig.png')
THRESHOLD = 240

def remove_bg():
    img = Image.open(img_path).convert('RGBA')
    img.save(backup_path)
    datas = img.getdata()
    new_data = []
    for item in datas:
        r, g, b, a = item
        if r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD:
            # make transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    img.save(img_path)
    print('Background cleared; backup saved to', backup_path)

if __name__ == '__main__':
    remove_bg()

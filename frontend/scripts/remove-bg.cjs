const JimpModule = require('jimp');
const Jimp = JimpModule.default || JimpModule;
const path = require('path');

// Config
const imgPath = path.join(__dirname, '..', 'public', 'assets', 'architectural_stack_3d.png');
const backupPath = imgPath.replace('.png', '.orig.png');
const THRESHOLD = 240; // RGB values above this are considered background (near-white)

async function removeBackground() {
  try {
    const image = await Jimp.read(imgPath);
    // Backup original
    await image.clone().writeAsync(backupPath);

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];

      // If pixel is near-white (all channels above threshold), make it transparent
      if (r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD) {
        this.bitmap.data[idx + 3] = 0;
      }
    });

    await image.writeAsync(imgPath);
    console.log('Background removed (near-white -> transparent). Backup saved to', backupPath);
  } catch (err) {
    console.error('Error processing image:', err);
    process.exitCode = 1;
  }
}

removeBackground();

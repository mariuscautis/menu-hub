// Convert SVG icons to PNG using sharp
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function convertIcons() {
  console.log('Converting SVG icons to PNG...\n');

  for (const size of sizes) {
    const svgPath = path.join(__dirname, 'public', `temp-${size}.svg`);
    const pngPath = path.join(__dirname, 'public', `icon-${size}x${size}.png`);

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);

      console.log(`✓ Created icon-${size}x${size}.png`);

      // Delete temporary SVG
      fs.unlinkSync(svgPath);
    } catch (error) {
      console.error(`✗ Failed to create ${size}x${size}:`, error.message);
    }
  }

  console.log('\n✓ Icon generation complete!');
  console.log('Note: Replace these placeholder icons with your Menu Hub logo for production.');
}

convertIcons();

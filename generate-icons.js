// Simple icon generator for PWA
// This creates basic placeholder icons - replace with your actual logo later

const fs = require('fs');
const path = require('path');

// SVG template with Menu Hub branding color
const createSVG = (size) => `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#6262bd"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">MH</text>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('Generating PWA icons...');

sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}x${size}.png`;
  const svgPath = path.join(__dirname, 'public', `temp-${size}.svg`);

  // Write SVG temporarily
  fs.writeFileSync(svgPath, svg);
  console.log(`Created SVG template for ${size}x${size}`);
});

console.log('\n⚠️  NOTE: SVG files created in /public directory');
console.log('For production, convert these to PNG using:');
console.log('  1. Online tool: https://www.svgtopng.com/');
console.log('  2. Or use: brew install librsvg && for f in public/temp-*.svg; do rsvg-convert -w $(echo $f | grep -o "[0-9]*") $f > ${f/temp-/icon-}; done');
console.log('  3. Then delete temp-*.svg files');
console.log('\nFor now, the PWA will work with SVG fallbacks.');

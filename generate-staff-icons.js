const fs = require('fs');
const { createCanvas } = require('canvas');

// Icon sizes to generate
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Staff app color scheme (purple theme)
const STAFF_BG_COLOR = '#8b5cf6'; // Purple background
const STAFF_TEXT_COLOR = '#ffffff'; // White text
const STAFF_BADGE_BG = '#6d28d9'; // Darker purple for badge
const STAFF_BADGE_TEXT = '#ffffff'; // White badge text

function generateStaffIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Draw rounded rectangle background
  const radius = size * 0.2; // 20% radius for rounded corners
  ctx.fillStyle = STAFF_BG_COLOR;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Draw "MH" text
  ctx.fillStyle = STAFF_TEXT_COLOR;
  ctx.font = `bold ${size * 0.45}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MH', size / 2, size / 2);

  // Draw "S" badge in bottom-right corner (for "Staff")
  const badgeSize = size * 0.35;
  const badgeX = size - badgeSize * 0.6;
  const badgeY = size - badgeSize * 0.6;
  const badgeRadius = badgeSize / 2;

  // Badge background
  ctx.fillStyle = STAFF_BADGE_BG;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Badge border
  ctx.strokeStyle = STAFF_TEXT_COLOR;
  ctx.lineWidth = size * 0.015;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Badge text "S"
  ctx.fillStyle = STAFF_BADGE_TEXT;
  ctx.font = `bold ${badgeSize * 0.6}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', badgeX, badgeY);

  return canvas;
}

// Generate all staff icons
sizes.forEach(size => {
  const canvas = generateStaffIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const filename = `public/staff-icon-${size}x${size}.png`;

  fs.writeFileSync(filename, buffer);
  console.log(`✓ Generated ${filename}`);
});

console.log('\n✅ All staff icons generated successfully!');
console.log('\nStaff icons feature:');
console.log('- Purple background (#8b5cf6) to match staff theme');
console.log('- "MH" text in white');
console.log('- "S" badge in bottom-right corner to indicate Staff app');

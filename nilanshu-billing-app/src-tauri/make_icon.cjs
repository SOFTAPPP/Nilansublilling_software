const sharp = require('sharp');
const path = require('path');

async function makeSquareIcon() {
  const input = path.join(__dirname, '..', 'public', 'logo.png');
  const output = path.join(__dirname, '..', 'public', 'icon_square.png');
  
  const image = sharp(input);
  const metadata = await image.metadata();
  
  const size = Math.max(metadata.width, metadata.height);
  
  await image
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .resize(1024, 1024)  // final size for Tauri icon generator
    .png()
    .toFile(output);
  
  console.log(`Created square icon: ${output} (1024x1024)`);
}

makeSquareIcon().catch(console.error);

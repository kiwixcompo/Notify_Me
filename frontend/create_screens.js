const sharp = require('sharp');

async function createScreenshots() {
  await sharp({
    create: { width: 1280, height: 720, channels: 4, background: { r: 37, g: 99, b: 235, alpha: 1 } }
  }).png().toFile('public/screenshot-1.png');

  await sharp({
    create: { width: 720, height: 1280, channels: 4, background: { r: 37, g: 99, b: 235, alpha: 1 } }
  }).png().toFile('public/screenshot-2.png');
  
  console.log('Screenshots created!');
}
createScreenshots().catch(console.error);

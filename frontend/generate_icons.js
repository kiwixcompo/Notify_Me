const sharp = require('sharp');
const fs = require('fs');

const inputImagePath = 'C:/Users/Admin/.gemini/antigravity/brain/547d1dd3-dfc3-45bd-9ee3-cdc40b27e097/notify_me_icon_1789481933497.jpg';

async function generateIcons() {
  const image = sharp(inputImagePath);
  
  // Create 192x192 PNG
  await image.resize(192, 192).png().toFile('public/icon-192.png');
  console.log('Created icon-192.png');
  
  // Create 512x512 PNG
  await image.resize(512, 512).png().toFile('public/icon-512.png');
  console.log('Created icon-512.png');
  
  // Create 512x512 PNG for push notifications
  await image.resize(512, 512).png().toFile('public/icon512_rounded.png');
  console.log('Created icon512_rounded.png');
  
  // Create 32x32 favicon
  await image.resize(32, 32).png().toFile('public/favicon.ico');
  console.log('Created favicon.ico');
}

generateIcons().catch(console.error);

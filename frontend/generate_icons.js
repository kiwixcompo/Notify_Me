const sharp = require('sharp');
const fs = require('fs');

const inputImagePath = 'public/icon.svg';

async function generateIcons() {
  const image = sharp(inputImagePath);
  
  await image.resize(192, 192).png().toFile('public/icon-192.png');
  await image.resize(512, 512).png().toFile('public/icon-512.png');
  await image.resize(512, 512).png().toFile('public/icon512_rounded.png');
  console.log('Icons generated successfully with transparent background!');
}

generateIcons().catch(console.error);

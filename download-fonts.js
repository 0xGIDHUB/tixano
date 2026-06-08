#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'public', 'fonts');

// Create fonts directory if it doesn't exist
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
  console.log('Created fonts directory');
}

// Use more reliable font sources
const fonts = [
  {
    name: 'DejaVuSans-Bold.ttf',
    // Try multiple sources
    urls: [
      'https://github.com/dejavu-fonts/dejavu-fonts/releases/download/2.37/DejaVuSans-Bold.ttf',
      'https://sourceforge.net/projects/dejavu/files/dejavu/2.37/DejaVuSans-Bold.ttf/download',
    ]
  },
  {
    name: 'DejaVuSans.ttf',
    urls: [
      'https://github.com/dejavu-fonts/dejavu-fonts/releases/download/2.37/DejaVuSans.ttf',
      'https://sourceforge.net/projects/dejavu/files/dejavu/2.37/DejaVuSans.ttf/download',
    ]
  }
];

const downloadFont = (url, filename) => {
  return new Promise((resolve, reject) => {
    const filepath = path.join(fontsDir, filename);

    console.log(`Attempting to download ${filename} from ${url.substring(0, 50)}...`);

    const request = https.get(url, { timeout: 10000 }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303) {
        if (response.headers.location) {
          console.log(`Redirected to ${response.headers.location.substring(0, 50)}...`);
          downloadFont(response.headers.location, filename).then(resolve).catch(reject);
        } else {
          reject(new Error(`Redirect without location header (${response.statusCode})`));
        }
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${filename}`));
        return;
      }

      const file = fs.createWriteStream(filepath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        const size = fs.statSync(filepath).size;
        if (size > 0) {
          console.log(`✓ ${filename} downloaded successfully (${size} bytes)`);
          resolve();
        } else {
          reject(new Error(`Downloaded file is empty: ${filepath}`));
        }
      });
    });

    request.on('error', (err) => {
      try {
        fs.unlinkSync(filepath);
      } catch (e) {
        // Ignore unlink errors
      }
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
};

const downloadFontWithFallback = async (font) => {
  for (const url of font.urls) {
    try {
      await downloadFont(url, font.name);
      return;
    } catch (error) {
      console.warn(`Failed to download from ${url.substring(0, 50)}... : ${error.message}`);
    }
  }
  throw new Error(`All download attempts failed for ${font.name}`);
};

const main = async () => {
  try {
    console.log('Starting font download...\n');
    
    for (const font of fonts) {
      try {
        await downloadFontWithFallback(font);
      } catch (error) {
        console.warn(`⚠ Could not download ${font.name}: ${error.message}`);
        // Don't fail the build if fonts can't be downloaded
        // The app will fall back to system fonts or canvas defaults
      }
    }

    // Verify which fonts were successfully downloaded
    console.log('\nFont download summary:');
    const downloadedFonts = fs.readdirSync(fontsDir);
    if (downloadedFonts.length > 0) {
      downloadedFonts.forEach(font => {
        const size = fs.statSync(path.join(fontsDir, font)).size;
        console.log(`  ✓ ${font} (${size} bytes)`);
      });
    } else {
      console.log('  No fonts were downloaded - will use system fonts or canvas defaults');
    }

    process.exit(0);
  } catch (error) {
    console.error('Critical error:', error.message);
    // Don't fail the build completely
    process.exit(0);
  }
};

main();


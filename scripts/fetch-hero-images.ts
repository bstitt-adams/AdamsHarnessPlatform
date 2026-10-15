#!/usr/bin/env ts-node
/**
 * Fetch hero images from Pexels and save to local folder
 * Run: npx ts-node scripts/fetch-hero-images.ts
 * 
 * Requires PEXELS_API_KEY in .env.local
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Hero slide image search terms
const heroImages = [
  {
    id: 'adams-1',
    filename: 'hero-1-adams.jpg',
    searchTerms: ['electrical construction', 'electrician panel', 'commercial construction site'],
    description: 'Build Trust Through Performance'
  },
  {
    id: 'adams-2',
    filename: 'hero-2-preconstruction.jpg',
    searchTerms: ['construction blueprints', 'estimating plans', 'construction planning meeting'],
    description: 'Plan With Confidence'
  },
  {
    id: 'adams-3',
    filename: 'hero-3-bim.jpg',
    searchTerms: ['3d building model', 'bim coordination', 'construction technology'],
    description: 'Coordinate Before You Build'
  },
  {
    id: 'adams-4',
    filename: 'hero-4-prefab.jpg',
    searchTerms: ['fabrication shop', 'prefab assembly', 'industrial workshop'],
    description: 'Build Offsite. Install Faster.'
  },
  {
    id: 'adams-5',
    filename: 'hero-5-turnover.jpg',
    searchTerms: ['construction crew working', 'electrician installing', 'completed commercial building'],
    description: 'From Groundbreak to Turnover'
  }
];

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith('#')) {
      process.env[match[1]] = match[2];
    }
  });
}

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!PEXELS_API_KEY) {
  console.error('❌ Error: PEXELS_API_KEY not found in .env.local');
  console.log('\nPlease add this line to your .env.local file:');
  console.log('PEXELS_API_KEY=your_api_key_here');
  console.log('\nGet a free API key at: https://www.pexels.com/api/');
  process.exit(1);
}

const downloadDir = path.join(__dirname, '..', 'public', 'images', 'hero');

// Create directory if needed
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

async function searchPexels(query: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.pexels.com',
      path: `/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      method: 'GET',
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location!, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function fetchHeroImages() {
  console.log('🎨 Fetching hero carousel images from Pexels...\n');

  for (const hero of heroImages) {
    console.log(`📸 Slide ${hero.id}: ${hero.description}`);
    
    let downloaded = false;
    
    // Try each search term until we find an image
    for (const searchTerm of hero.searchTerms) {
      try {
        const data = await searchPexels(searchTerm);
        
        if (data.photos && data.photos.length > 0) {
          const photo = data.photos[0];
          const imageUrl = photo.src.large2x || photo.src.large;
          const photographer = photo.photographer;
          
          const filepath = path.join(downloadDir, hero.filename);
          
          console.log(`  🔍 Searching: "${searchTerm}"`);
          console.log(`  ✅ Found: "${photo.alt || 'Business image'}" by ${photographer}`);
          console.log(`  💾 Downloading to ${filepath}...`);
          
          await downloadImage(imageUrl, filepath);
          
          // Save metadata
          const metadataPath = filepath.replace('.jpg', '.json');
          fs.writeFileSync(metadataPath, JSON.stringify({
            id: photo.id,
            photographer,
            photographerUrl: photo.photographer_url,
            source: 'pexels',
            searchTerm,
            slide: hero.id,
            description: hero.description
          }, null, 2));
          
          console.log(`  ✓ Saved!\n`);
          downloaded = true;
          break;
        }
      } catch (error) {
        console.log(`  ⚠️  Search failed for "${searchTerm}": ${(error as Error).message}`);
      }
    }
    
    if (!downloaded) {
      console.log(`  ❌ Could not find image for this slide\n`);
    }
  }

  console.log('\n🎉 Done! Images saved to:', downloadDir);
  console.log('\nNext steps:');
  console.log('1. Review the downloaded images');
  console.log('2. Go to /portal/admin/images');
  console.log('3. Upload each image with category "hero"');
  console.log('4. Go to /portal/admin/hero and link images to slides');
}

fetchHeroImages().catch(console.error);

require('dotenv').config();
const { fetchItemsFromMultipleSources, detectFeedFormat } = require('./src/services/rssService');

// Test the specific feeds from the user's requirements
const testFeeds = [
  // Jobs
  {
    name: 'Jobs Found',
    url: 'https://rss.app/feeds/Ved3zhgCZQ7I2XNo.xml',
    type: 'job'
  },
  {
    name: 'Himalayas',
    url: 'https://himalayas.app/jobs/rss',
    type: 'job'
  },
  {
    name: 'We Work Remotely',
    url: 'https://weworkremotely.com/remote-jobs.rss',
    type: 'job'
  },
  // Scholarships
  {
    name: 'Scholarships Region',
    url: 'https://rss.app/feeds/VxzvBe8gQnW32JhP.xml',
    type: 'scholarship'
  },
  {
    name: 'Scholarships and Aid',
    url: 'https://rss.app/feeds/dh2Nxk5zrvEhzRd3.xml',
    type: 'scholarship'
  }
];

async function testAllFeeds() {
  console.log('🧪 Testing RSS Feeds...\n');
  
  for (const feed of testFeeds) {
    console.log(`\n📡 Testing: ${feed.name}`);
    console.log(`🔗 URL: ${feed.url}`);
    
    try {
      // Detect format
      const format = await detectFeedFormat(feed.url);
      console.log(`📋 Detected format: ${format}`);
      
      // Fetch items
      const items = await fetchItemsFromMultipleSources([feed], feed.type);
      console.log(`✅ Successfully fetched ${items.length} items`);
      
      if (items.length > 0) {
        const firstItem = items[0];
        console.log(`📄 Sample item:`);
        console.log(`   Title: ${firstItem.title?.substring(0, 80)}...`);
        console.log(`   Link: ${firstItem.link}`);
        console.log(`   Date: ${firstItem.pubDate}`);
        console.log(`   Categories: ${Array.isArray(firstItem.categories) ? firstItem.categories.join(', ') : 'None'}`);
        console.log(`   Format flags: XML=${firstItem.isXML}, JSON=${firstItem.isJSON}, CSV=${firstItem.isCSV}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('─'.repeat(80));
  }
  
  console.log('\n🏁 Feed testing completed!');
  process.exit(0);
}

testAllFeeds().catch(console.error);
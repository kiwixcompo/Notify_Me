require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const RssFeed = require('./src/models/RssFeed');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to MongoDB');
    
    const users = await User.find({});
    console.log(`👥 Found ${users.length} users:`);
    
    for (const user of users) {
      console.log(`- ${user.name} (${user.email}) - ID: ${user._id}`);
      
      // Check their feeds
      const feeds = await RssFeed.find({ user: user._id });
      console.log(`  📡 Has ${feeds.length} feeds:`);
      feeds.forEach(feed => {
        console.log(`    - ${feed.name || 'Unnamed'}: ${feed.url} (${feed.type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkUsers();
require('dotenv').config();
const mongoose = require('mongoose');
const { getUserJobs } = require('./src/controllers/jobController');

// Mock request and response objects
const mockReq = {
  userId: '68783632414917f089ae6075', // Real user ID from database
  query: {}
};

const mockRes = {
  json: (data) => {
    console.log('✅ Response:', JSON.stringify(data, null, 2));
  },
  status: (code) => ({
    json: (data) => {
      console.log(`❌ Error ${code}:`, JSON.stringify(data, null, 2));
    }
  })
};

const mockNext = (error) => {
  console.log('❌ Next Error:', error);
};

async function testJobController() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to MongoDB');
    
    console.log('🧪 Testing Job Controller...\n');
    
    // Test the getUserJobs function
    await getUserJobs(mockReq, mockRes, mockNext);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

testJobController();
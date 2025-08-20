const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';

async function testSearchEndpoints() {
  console.log('🔍 Testing Search Endpoints...\n');

  try {
    // Test job search
    console.log('1. Testing Job Search...');
    const jobResponse = await axios.get(`${API_BASE}/jobs/search`, {
      params: { query: 'remote developer', limit: 5 }
    });
    console.log(`✅ Job search successful: ${jobResponse.data.jobs?.length || 0} jobs found`);
    if (jobResponse.data.jobs?.length > 0) {
      console.log(`   First job: ${jobResponse.data.jobs[0].title}`);
      console.log(`   Sources: ${jobResponse.data.sources?.join(', ')}`);
    }

    // Test scholarship search
    console.log('\n2. Testing Scholarship Search...');
    const scholarshipResponse = await axios.get(`${API_BASE}/scholarships/search`, {
      params: { query: 'computer science', limit: 5 }
    });
    console.log(`✅ Scholarship search successful: ${scholarshipResponse.data.scholarships?.length || 0} scholarships found`);
    if (scholarshipResponse.data.scholarships?.length > 0) {
      console.log(`   First scholarship: ${scholarshipResponse.data.scholarships[0].title}`);
      console.log(`   Sources: ${scholarshipResponse.data.sources?.join(', ')}`);
    }

    // Test predefined feeds
    console.log('\n3. Testing Predefined Feeds...');
    const feedsResponse = await axios.get(`${API_BASE}/predefined-feeds/categories`, {
      params: { type: 'job' }
    });
    console.log(`✅ Predefined feeds successful: ${feedsResponse.data.categories?.length || 0} job categories found`);

    const scholarshipFeedsResponse = await axios.get(`${API_BASE}/predefined-feeds/categories`, {
      params: { type: 'scholarship' }
    });
    console.log(`✅ Scholarship feeds successful: ${scholarshipFeedsResponse.data.categories?.length || 0} scholarship categories found`);

    console.log('\n🎉 All search endpoints are working!');
    
  } catch (error) {
    console.error('❌ Error testing search endpoints:', error.response?.data || error.message);
  }
}

testSearchEndpoints(); 
const axios = require('axios');

const API_URL = 'http://localhost:4000';

async function testAPI() {
  console.log('Testing API endpoints...\n');

  try {
    // Test predefined feeds categories
    console.log('1. Testing predefined feeds categories...');
    const categoriesRes = await axios.get(`${API_URL}/api/predefined-feeds/categories?type=job`);
    console.log('Job categories:', categoriesRes.data.categories.length, 'categories found');
    
    const scholarshipCategoriesRes = await axios.get(`${API_URL}/api/predefined-feeds/categories?type=scholarship`);
    console.log('Scholarship categories:', scholarshipCategoriesRes.data.categories.length, 'categories found');

    // Test scholarships endpoint
    console.log('\n2. Testing scholarships endpoint...');
    const scholarshipsRes = await axios.get(`${API_URL}/api/scholarships`);
    console.log('Scholarships response:', scholarshipsRes.status);

    // Test health endpoint
    console.log('\n3. Testing health endpoint...');
    const healthRes = await axios.get(`${API_URL}/api/health`);
    console.log('Health check:', healthRes.data);

    console.log('\n✅ All API endpoints are working!');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI(); 
const axios = require('axios');

async function testAuth() {
  const baseUrl = 'http://localhost:4000/api/auth';
  
  try {
    // Register a new user
    console.log('Registering test user...');
    const registerResponse = await axios.post(`${baseUrl}/register`, {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!'
    });
    console.log('Registration successful:', registerResponse.data);
    
    // Login with the new user
    console.log('\nLogging in...');
    const loginResponse = await axios.post(`${baseUrl}/login`, {
      email: 'test@example.com',
      password: 'Password123!'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful. Token:', token);
    
    // Test the website links endpoint
    console.log('\nTesting website links endpoint...');
    const linksResponse = await axios.get('http://localhost:4000/api/feeds/website-links', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Website links:', linksResponse.data);
    
  } catch (error) {
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
}

testAuth();

import axios from 'axios';

export default async function handler(req, res) {
  const { method, body, query } = req;
  const token = req.headers.authorization || '';
  
  console.log(`[${new Date().toISOString()}] ${method} /api/feeds/website-links`, {
    query,
    hasBody: !!body,
    hasToken: !!token
  });
  
  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/feeds/website-links${query.id ? `/${query.id}` : ''}`;
    
    console.log('Forwarding to:', url);
    
    const response = await axios({
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      data: body,
      params: query,
    });
    
    console.log('Response status:', response.status);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack
    });
    
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Internal Server Error',
      details: error.response?.data?.message || error.message
    });
  }
}

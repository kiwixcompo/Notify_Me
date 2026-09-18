import axios from 'axios';
import { getApiBase } from '../../../../utils/apiBase';

export default async function handler(req, res) {
  const { method, body, query } = req;
  const token = req.headers.authorization || '';
  const { id } = req.query;
  
  try {
    const response = await axios({
      method,
      url: `${getApiBase()}/api/feeds/website-links/${id}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      data: body,
      params: query,
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('API Error:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Internal Server Error',
    });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { roll } = req.query;
  if (!roll) {
    return res.status(400).json({ success: false, message: 'Missing roll parameter' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const extraInfoUrl = `https://script.google.com/macros/s/AKfycbwrLxKMKqLeFB9YlNLxMukpKn3eENPtvbdsO3zQwdDyJYqhylJRyxpyE3qmlgzxdw/exec?roll=${roll}`;
    const extraResponse = await fetch(extraInfoUrl, { 
      signal: controller.signal,
      redirect: 'follow'
    });
    
    if (extraResponse.ok) {
      const extraData = await extraResponse.json();
      
      // Set cache headers
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
      return res.status(200).json(extraData);
    }
    
    return res.status(extraResponse.status).json({ success: false, message: 'Failed to fetch student info' });
  } catch (error: any) {
    console.error('Student info proxy error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    clearTimeout(timeout);
  }
}

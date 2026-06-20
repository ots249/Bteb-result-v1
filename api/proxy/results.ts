import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { roll, curriculumId } = req.query;
  
  if (!roll || !curriculumId) {
    return res.status(400).json({ success: false, message: 'Missing parameters' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout

  try {
    const targetUrl = `https://btebresultszone.com/api/student-results?roll=${roll}&curriculumId=${curriculumId}`;
    
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://btebresultszone.com/',
        'Origin': 'https://btebresultszone.com',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      }
    });

    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
      let message = `BTEB server returned ${response.status}`;
      if (response.status === 404) message = 'Result not found. Please check your roll number.';
      if (response.status === 403 || response.status === 429) message = 'BTEB server is limiting requests. Try again in a minute.';
      
      return res.status(response.status).json({
        success: false,
        message,
        data: data || []
      });
    }

    // Set some cache headers for performance
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Proxy error details:', error);
    
    let message = 'Failed to fetch results from BTEB server';
    if (error.name === 'AbortError') {
      message = 'Connection timed out. The BTEB server is taking too long to respond.';
    }

    return res.status(500).json({ 
      success: false, 
      message,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    clearTimeout(timeout);
  }
}

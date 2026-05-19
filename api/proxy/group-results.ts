import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { rollRanges, curriculumId, regulation } = req.query;
  
  if (!rollRanges || !curriculumId || !regulation) {
    return res.status(400).json({ success: false, message: 'Missing parameters' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout for group results

  try {
    const targetUrl = `https://btebresultszone.com/api/group-results?rollRanges=${rollRanges}&curriculumId=${curriculumId}&regulation=${regulation}`;
    
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://btebresultszone.com/',
        'Origin': 'https://btebresultszone.com',
        'Connection': 'keep-alive',
      }
    });

    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `BTEB server returned ${response.status}`,
        data: data || []
      });
    }

    // Set cache headers
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Group proxy error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch group results',
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    clearTimeout(timeout);
  }
}

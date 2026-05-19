import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use CORS
  app.use(cors());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Proxy API route to avoid CORS
  app.get('/api/proxy/results', async (req, res) => {
    const { roll, curriculumId } = req.query;
    if (!roll || !curriculumId) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout

    try {
      const targetUrl = `https://btebresultszone.com/api/student-results?roll=${roll}&curriculumId=${curriculumId}`;
      console.log(`Proxying request to: ${targetUrl}`);
      
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

      res.json(data);
    } catch (error: any) {
      console.error('Proxy error details:', error);
      
      let message = 'Failed to fetch results from BTEB server';
      if (error.name === 'AbortError') {
        message = 'Connection timed out. The BTEB server is taking too long to respond.';
      } else if (error.message?.includes('522')) {
        message = 'The BTEB server is currently unreachable (522 Connection Timeout). Please try again in a few minutes.';
      }

      res.status(500).json({ 
        success: false, 
        message,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  // Proxy API route for extra student information
  app.get('/api/proxy/student-info', async (req, res) => {
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
        return res.json(extraData);
      }
      res.status(extraResponse.status).json({ success: false, message: 'Failed to fetch student info' });
    } catch (error: any) {
      console.error('Student info proxy error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      clearTimeout(timeout);
    }
  });

  // Proxy API route for group results
  app.get('/api/proxy/group-results', async (req, res) => {
    const { rollRanges, curriculumId, regulation } = req.query;
    if (!rollRanges || !curriculumId || !regulation) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout for group results as it takes longer

    try {
      const targetUrl = `https://btebresultszone.com/api/group-results?rollRanges=${rollRanges}&curriculumId=${curriculumId}&regulation=${regulation}`;
      console.log(`Proxying group result request to: ${targetUrl}`);
      
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

      res.json(data);
    } catch (error: any) {
      console.error('Group proxy error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch group results',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

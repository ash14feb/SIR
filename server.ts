import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as cheerio from 'cheerio';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get('/api/search', async (req, res) => {
    const name = req.query.name as string;
    const ac = (req.query.ac as string) || 'A117';
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name parameter is required' });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      // Dynamic ac as selected by the user, and dynamic name search
      const url = `https://ceo.karnataka.gov.in/search/en?district=MYSORE&ac=${encodeURIComponent(ac)}&search=${encodeURIComponent(name)}`;
      
      let html = '';

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`Failed to fetch from source: ${response.status}`);
        }
        html = await response.text();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error('Real API failed', fetchError);
        
        let errorMessage = 'Could not reach the Karnataka CEO server (connection timed out).';
        if (fetchError.name === 'AbortError') {
          errorMessage = 'The request to the Karnataka CEO server timed out after 15 seconds.';
        }
        
        return res.status(502).json({ 
          error: `${errorMessage} Government firewalls and CDNs (such as those protecting ceo.karnataka.gov.in) frequently block requests originating from public cloud providers like Google Cloud Run, AWS, or Azure to prevent automated scraping. Since this applet is hosted on Google Cloud Run, the outbound request is being blocked. Testing this server code on your local machine will work perfectly because it will use your local network IP (just like Postman).` 
        });
      }

      const $ = cheerio.load(html);
      
      const table = $('.container-vvl table');
      
      if (table.length === 0) {
        return res.json({ headers: [], results: [] });
      }

      const headers: string[] = [];
      table.find('tr').first().find('th').each((i, el) => {
        headers.push($(el).text().trim());
      });

      const results: Record<string, string>[] = [];
      table.find('tr').slice(1).each((i, el) => {
        const row: Record<string, string> = {};
        $(el).find('td').each((j, td) => {
          const key = headers[j] || `Column ${j + 1}`;
          row[key] = $(td).text().trim();
        });
        
        if (Object.keys(row).length > 0) {
          results.push(row);
        }
      });

      res.json({ headers, results });
    } catch (error: any) {
      console.error('Scraping Error:', error);
      res.status(500).json({ error: 'Failed to fetch search results from the server.' });
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

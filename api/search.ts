import * as cheerio from 'cheerio';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const name = req.query.name as string;
  const ac = (req.query.ac as string) || 'A117';
  const lang = (req.query.lang as string) === 'ka' ? 'ka' : 'en';
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name parameter is required' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const district = lang === 'ka' ? 'ಮೈಸೂರು' : 'MYSORE';
    const url = `https://ceo.karnataka.gov.in/search/${lang}?district=${encodeURIComponent(district)}&ac=${encodeURIComponent(ac)}&search=${encodeURIComponent(name)}`;
    
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
        error: `${errorMessage} Government firewalls and CDNs (such as those protecting ceo.karnataka.gov.in) frequently block requests originating from public cloud providers like Google Cloud, AWS, Vercel, or Azure to prevent automated scraping. Testing this API on your local machine or using a local proxy will work perfectly because it uses your local network IP.` 
      });
    }

    const $ = cheerio.load(html);
    
    const table = $('.container-vvl table');
    
    if (table.length === 0) {
      return res.status(200).json({ headers: [], results: [] });
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

    return res.status(200).json({ headers, results });
  } catch (error: any) {
    console.error('Scraping Error:', error);
    return res.status(500).json({ error: 'Failed to fetch search results from the server.' });
  }
}

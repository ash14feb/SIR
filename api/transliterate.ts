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

  const text = req.query.text as string;
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  try {
    const words = text.trim().split(/\s+/);
    const transliteratedWords = [];
    
    for (const word of words) {
      // If word is already non-Latin, don't transliterate it
      if (!/^[a-zA-Z]+$/.test(word)) {
        transliteratedWords.push(word);
        continue;
      }

      const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=kn-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
          transliteratedWords.push(data[1][0][1][0] || word);
        } else {
          transliteratedWords.push(word);
        }
      } else {
        transliteratedWords.push(word);
      }
    }

    const result = transliteratedWords.join(' ');
    return res.status(200).json({ result });
  } catch (error: any) {
    console.error('Transliteration failed', error);
    return res.status(500).json({ error: 'Failed to transliterate text' });
  }
}

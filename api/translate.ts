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
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=kn&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        return res.status(200).json({ result: data[0][0][0] });
      }
    }
    return res.status(502).json({ error: 'Failed to translate from Google API' });
  } catch (error: any) {
    console.error('Translation failed', error);
    return res.status(500).json({ error: 'Failed to translate text' });
  }
}

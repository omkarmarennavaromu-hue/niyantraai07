import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required and must be a non-empty string.' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error. API key missing.' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
        'X-Title': 'NIYANTRA AI Study Assistant'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are NIYANTRA AI Study Assistant, a premium learning companion for JEE, KCET, NEET, NDA, and UPSC exam preparation. Provide detailed, structured, exam-ready responses with clarity and precision.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', response.status, errorData);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid API key or authentication failed.' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'API quota exceeded. Please try again later.' });
      }
      
      return res.status(500).json({ 
        error: 'OpenRouter API request failed.',
        details: errorData.error?.message || 'Unknown error'
      });
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected OpenRouter response structure:', data);
      return res.status(500).json({ error: 'Invalid response from AI service.' });
    }

    const reply = data.choices[0].message.content;
    
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('OpenRouter API error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate AI response. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

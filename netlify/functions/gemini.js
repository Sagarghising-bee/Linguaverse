// netlify/functions/gemini.js
// Serverless proxy — keeps API key hidden on server, never exposed to browser

exports.handler = async function(event, context) {

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get API key from Netlify environment variable — never exposed to client
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured on server' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const model = body.model || 'gemini-2.5-flash-lite';

    // Forward request to Gemini API with the real key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.payload),
      }
    );

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        // Allow calls from your Netlify domain only
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

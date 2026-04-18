export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { firstname, email, brandName, expertise, industry, location } = req.body;

  try {
    const response = await fetch(
      'https://a.klaviyo.com/client/subscriptions/?company_id=' + process.env.KLAVIYO_PUBLIC_KEY,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'revision': '2023-12-15'
        },
        body: JSON.stringify({
          data: {
            type: 'subscription',
            attributes: {
              list_id: process.env.KLAVIYO_LIST_ID,
              custom_source: 'Radar Visibility Estimate Tool',
              profile: {
                data: {
                  type: 'profile',
                  attributes: {
                    email: email,
                    first_name: firstname,
                    properties: {
                      brand_name: brandName,
                      expertise: expertise,
                      industry: industry,
                      location: location,
                      lead_source: 'Radar Visibility Estimate'
                    }
                  }
                }
              }
            }
          }
        })
      }
    );

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (err) {
    res.status(500).json({ error: 'Klaviyo proxy error', detail: err.message });
  }
}

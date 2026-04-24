// api/score.js
// Vercel serverless function — Claude scoring engine + Klaviyo lead capture

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subj, topic, niche, loc, email, fn } = req.body || {};

  if (!subj || !topic) {
    return res.status(400).json({ error: 'subj and topic are required' });
  }

  // ── 1. Fire Klaviyo lead capture in background (don't await) ──
  captureKlaviyoLead({ email, fn, subj, topic, niche, loc }).catch(console.warn);

  // ── 2. Call Claude for scoring ──────────────────────────────
  const prompt = buildPrompt(subj, topic, niche, loc);

  try {
    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeResp.ok) {
      const err = await claudeResp.text();
      console.error('Claude API error:', err);
      return res.status(500).json({ error: 'Claude API failed', detail: err });
    }

    const claudeData = await claudeResp.json();
    const rawText = claudeData.content.map(b => b.text || '').join('');

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed  = JSON.parse(cleaned);

    // Calculate total score server-side (trust the scores array, not model-reported total)
    let total = 0;
    const PLATFORMS = ['claude', 'chatgpt', 'perplexity', 'gemini'];
    for (const p of PLATFORMS) {
      for (const s of (parsed.scores?.[p] || [])) total += Number(s);
    }
    parsed.totalScore = total;
    parsed.benchmarkScores = {
      yourScore:       total,
      industryAverage: 31,
      radarClient:     87,
      topPerformer:    112,
    };

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Score handler error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}

// ── PROMPT ────────────────────────────────────────────────────
function buildPrompt(subj, topic, niche, loc) {
  const location = loc || 'Australia';
  const nicheStr = niche ? ` in the ${niche} niche` : '';

  return `You are the Radar Visibility Scoring Engine for Radar Consultancy.
Your job is to assess and score how visible "${subj}" is in AI search systems for the topic "${topic}"${nicheStr} from "${location}".

You are simulating the Radar Visibility Score methodology:
12 standardised queries run across 4 AI platforms (Claude, ChatGPT, Perplexity, Gemini), each scored 0–3:
- 0 = Not found / not mentioned
- 1 = Briefly mentioned or tangentially referenced
- 2 = Referenced with meaningful context and attribution
- 3 = Primary citation / definitive expert source

The 12 query types (generate realistic, specific queries based on the inputs):
1. Direct name recognition ("Who is ${subj}?")
2. Brand + topic ("${subj} ${topic}")
3. Name + credential ("${subj} expert credentials")
4. Expert identification ("who is the leading ${topic} expert in ${location}?")
5. Problem-solution ("best approach to ${topic}")
6. Credential query ("${topic} specialist ${location}")
7. Topic authority ("${topic} framework or methodology")
8. Topic definition ("what is the best approach to ${topic}?")
9. Topic trend ("latest thinking on ${topic}")
10. Competitor context ("${topic} experts compared")
11. Comparative ("${subj} vs other ${topic} experts")
12. Trust signal ("is ${subj} credible for ${topic}?")

CALIBRATION GUIDE — be realistic and accurate:
- Globally recognised figures (Gabor Maté, Brené Brown): total score 90–130
- Nationally known experts with books, major media, Wikipedia: 60–90
- Well-established niche experts with strong online presence: 35–60
- Mid-tier professionals building their profile: 15–35
- Early-stage or low-visibility experts: 5–20

CRITICAL GAP ANALYSIS RULES:
- Gaps must be tailored to the person's ACTUAL estimated visibility level
- Do NOT apply generic "you don't exist" gaps to well-known people
- For high-visibility: gaps about citation accuracy, topic ownership, competitor displacement, schema markup
- For mid-visibility: gaps about inconsistent attribution, missing structured data, thin platform coverage
- For low-visibility: foundational entity recognition, content footprint, third-party citations
- All gaps should be specific, actionable and directly relevant to ${subj}'s situation in ${topic}

Respond ONLY in valid JSON. No markdown, no backticks, no preamble. Exactly this structure:
{
  "scores": {
    "claude":     [0,1,0,1,0,1,0,0,1,0,0,1],
    "chatgpt":    [0,1,0,0,1,0,0,1,0,0,1,0],
    "perplexity": [1,1,0,1,0,0,1,0,0,1,0,0],
    "gemini":     [0,0,1,0,1,0,0,0,1,0,1,0]
  },
  "queries": [
    "Query 1 specific to ${subj}",
    "Query 2 specific to ${subj}",
    "Query 3 specific to ${subj}",
    "Query 4 specific to ${subj}",
    "Query 5 specific to ${subj}",
    "Query 6 specific to ${subj}",
    "Query 7 specific to ${subj}",
    "Query 8 specific to ${subj}",
    "Query 9 specific to ${subj}",
    "Query 10 specific to ${subj}",
    "Query 11 specific to ${subj}",
    "Query 12 specific to ${subj}"
  ],
  "gaps": [
    { "severity": "high", "title": "Specific gap title", "detail": "2 sentences specific to this person's actual situation." },
    { "severity": "high", "title": "Specific gap title", "detail": "2 sentences." },
    { "severity": "med",  "title": "Specific gap title", "detail": "2 sentences." },
    { "severity": "med",  "title": "Specific gap title", "detail": "2 sentences." },
    { "severity": "low",  "title": "Specific gap title", "detail": "2 sentences." }
  ],
  "summary": "3 sentences summarising ${subj}'s AI visibility situation honestly and accurately. Acknowledge high visibility where it exists. Be specific about what the score means for their particular topic and situation.",
  "benchmarkScores": {
    "yourScore": 0,
    "industryAverage": 31,
    "radarClient": 87,
    "topPerformer": 112
  }
}`;
}

const KLAVIYO_REVISION = '2023-12-15';

const klaviyoHeaders = (key) => ({
  'Content-Type': 'application/vnd.api+json',
  Accept: 'application/vnd.api+json',
  Authorization: `Klaviyo-API-Key ${key}`,
  revision: KLAVIYO_REVISION,
});

// ── KLAVIYO LEAD CAPTURE ────────────────────────────────────
async function captureKlaviyoLead({ email, fn, subj, topic, niche, loc }) {
  const key    = process.env.KLAVIYO_PRIVATE_KEY;
  const listId = process.env.KLAVIYO_LIST_ID;

  if (!key || !listId || !email) {
    console.warn('[Klaviyo] skip: missing KLAVIYO_PRIVATE_KEY, KLAVIYO_LIST_ID, or email');
    return;
  }

  const payload = {
    data: {
      type: 'profile',
      attributes: {
        email,
        first_name: fn || '',
        properties: {
          radar_subject:  subj  || '',
          radar_topic:    topic || '',
          radar_niche:    niche || '',
          radar_location: loc   || '',
          radar_source:   'visibility-estimate',
          radar_date:     new Date().toISOString(),
        },
      },
    },
  };

  // Create profile (new emails → 201; existing email → 409 + duplicate_profile_id in body)
  const profileResp = await fetch('https://a.klaviyo.com/api/profiles/', {
    method: 'POST',
    headers: klaviyoHeaders(key),
    body: JSON.stringify(payload),
  });

  let profileId;
  if (profileResp.status === 201) {
    const pData = await profileResp.json();
    profileId = pData?.data?.id;
  } else if (profileResp.status === 409) {
    const errData = await profileResp.json().catch(() => ({}));
    profileId =
      errData?.errors?.[0]?.meta?.duplicate_profile_id ||
      (() => {
        const loc = profileResp.headers.get('location') || '';
        return loc.split('/').filter(Boolean).pop();
      })();
  } else {
    const errText = await profileResp.text();
    console.error('[Klaviyo] create profile failed', profileResp.status, errText.slice(0, 500));
    return;
  }

  if (!profileId) {
    console.error('[Klaviyo] no profile id after create/409');
    return;
  }

  const listResp = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
    method: 'POST',
    headers: klaviyoHeaders(key),
    body: JSON.stringify({
      data: [{ type: 'profile', id: profileId }],
    }),
  });

  if (!listResp.ok) {
    const errText = await listResp.text();
    console.error('[Klaviyo] add to list failed', listResp.status, errText.slice(0, 500));
  }
}

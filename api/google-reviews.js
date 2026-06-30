const DEFAULT_PLACE_QUERY = 'Prestige Serves Los Angeles CA';

function cleanReview(review) {
  return {
    authorName: review.author_name || 'Google reviewer',
    authorUrl: review.author_url || '',
    profilePhotoUrl: review.profile_photo_url || '',
    rating: Number(review.rating) || 0,
    relativeTimeDescription: review.relative_time_description || '',
    text: review.text || '',
    time: review.time || 0,
  };
}

async function resolvePlaceId(apiKey) {
  if (process.env.GOOGLE_PLACE_ID) {
    return process.env.GOOGLE_PLACE_ID;
  }

  const query = process.env.GOOGLE_PLACE_QUERY || DEFAULT_PLACE_QUERY;
  const params = new URLSearchParams({
    input: query,
    inputtype: 'textquery',
    fields: 'place_id',
    key: apiKey,
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params.toString()}`);
  const data = await response.json();

  if (data.status !== 'OK' || !data.candidates || !data.candidates[0]) {
    throw new Error(data.error_message || `Unable to resolve Google Place ID (${data.status || 'unknown status'})`);
  }

  return data.candidates[0].place_id;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: 'Google reviews are not configured. Add GOOGLE_MAPS_API_KEY to the server environment.',
    });
  }

  try {
    const placeId = await resolvePlaceId(apiKey);
    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'name,rating,user_ratings_total,reviews,url',
      reviews_sort: 'newest',
      key: apiKey,
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`);
    const data = await response.json();

    if (data.status !== 'OK') {
      return res.status(502).json({
        success: false,
        message: data.error_message || `Google Places returned ${data.status || 'an error'}`,
      });
    }

    const result = data.result || {};
    const reviews = Array.isArray(result.reviews) ? result.reviews.map(cleanReview) : [];

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      success: true,
      place: {
        name: result.name || 'Prestige Serves',
        rating: Number(result.rating) || 0,
        userRatingsTotal: Number(result.user_ratings_total) || 0,
        url: result.url || '',
      },
      reviews,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Unable to load Google reviews',
    });
  }
}

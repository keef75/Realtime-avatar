import { NextResponse } from 'next/server';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const BASE_API_URL = process.env.NEXT_PUBLIC_BASE_API_URL || 'https://api.heygen.com';

export async function POST() {
  if (!HEYGEN_API_KEY) {
    console.error('HEYGEN_API_KEY is not configured');
    return NextResponse.json(
      { error: 'HeyGen API key not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${BASE_API_URL}/v1/streaming.create_token`, {
      method: 'POST',
      headers: {
        'x-api-key': HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('HeyGen API error:', error);
      return NextResponse.json(
        { error: 'Failed to create HeyGen token' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.data?.token) {
      console.error('Invalid HeyGen token response:', data);
      return NextResponse.json(
        { error: 'Invalid token response from HeyGen' },
        { status: 500 }
      );
    }

    return NextResponse.json({ token: data.data.token });
  } catch (error) {
    console.error('Error creating HeyGen token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

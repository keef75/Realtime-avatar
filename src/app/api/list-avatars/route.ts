import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;

    if (!apiKey) {
      console.error('HEYGEN_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.heygen.com/v1/streaming.avatar.list', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen API error:', response.status, errorText);
      return NextResponse.json(
        { error: `HeyGen API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching HeyGen avatars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch avatars' },
      { status: 500 }
    );
  }
}

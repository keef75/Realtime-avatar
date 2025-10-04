# Quick Start: Local HeyGen + OpenAI Integration

## Simple Local Setup (Direct API Key)

Your `.env` file already has everything you need:

```bash
OPENAI_API_KEY=your_openai_key
HEYGEN_API_KEY=your_heygen_key
NEXT_PUBLIC_BASE_API_URL=https://api.heygen.com
```

## For Direct Client-Side Use (Simplest)

If you want to use HeyGen directly in the browser without a token server:

### Option 1: Add to `.env`
```bash
NEXT_PUBLIC_HEYGEN_API_KEY=your_heygen_key
```

### Option 2: Use Existing Setup with Token Route

Your current setup uses the **token generation approach** (from the HeyGen demo), which is already configured:

**Backend** (`/app/api/get-access-token/route.ts` - already exists in HeyGen demo):
```typescript
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export async function POST() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_API_URL}/v1/streaming.create_token`, {
    method: "POST",
    headers: { "x-api-key": HEYGEN_API_KEY },
  });
  const data = await res.json();
  return new Response(data.data.token, { status: 200 });
}
```

**Client Usage**:
```typescript
// Get token from your backend
const token = await fetch('/api/get-access-token', {
  method: 'POST'
}).then(r => r.text());

// Initialize HeyGen avatar
const avatar = new StreamingAvatar({ token });
```

## Recommended: Use Your Current Setup

Since you already have `HEYGEN_API_KEY` in `.env`, just use the existing token approach from the HeyGen demo. It's already secure for local development because:

1. API key stays in `.env` (never committed to git)
2. Token is generated server-side
3. Works the same locally and in production

## Integration with OpenAI Realtime

```typescript
import { StreamingAvatar, AvatarQuality, TaskType } from '@heygen/streaming-avatar';

// 1. Get HeyGen token
const token = await fetch('/api/get-access-token', {
  method: 'POST'
}).then(r => r.text());

// 2. Initialize HeyGen avatar
const avatar = new StreamingAvatar({ token });

const session = await avatar.createStartAvatar({
  quality: AvatarQuality.High,
  avatarName: 'Ann_Therapist_public',
  language: 'en',
});

// 3. Connect video stream
const videoElement = document.getElementById('avatarVideo');
avatar.on('stream_ready', (stream) => {
  videoElement.srcObject = stream;
  videoElement.play();
});

// 4. Listen to OpenAI responses and send to HeyGen
realtimeSession.on('response.audio_transcript.done', async (event) => {
  await avatar.speak({
    text: event.transcript,
    taskType: TaskType.REPEAT
  });
});
```

## Why Your Current Setup is Better

Your existing `.env` structure with `HEYGEN_API_KEY` (server-side) is actually **better than direct client exposure** because:

- ✅ API key never exposed in browser
- ✅ Works locally and in production
- ✅ Same pattern as the official HeyGen demo
- ✅ Still simple - just one API route

## Next Steps

1. ✅ Your `.env` is already configured correctly
2. ✅ You have both `OPENAI_API_KEY` and `HEYGEN_API_KEY`
3. ⬜ Create the integration hook (see `HEYGEN_INTEGRATION.md`)
4. ⬜ Connect OpenAI responses to HeyGen avatar

You're all set! The token approach you have is perfect for local development.

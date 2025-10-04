# HeyGen + OpenAI Realtime Integration - Usage Guide

## Overview

This project now includes a working integration between OpenAI's Realtime API and HeyGen's Streaming Avatar API. The avatar will visually speak the AI agent's responses in real-time.

## Setup

1. **Environment Variables**

   Make sure both API keys are configured in your `.env` file:
   ```bash
   OPENAI_API_KEY=your_openai_api_key
   HEYGEN_API_KEY=your_heygen_api_key
   NEXT_PUBLIC_BASE_API_URL=https://api.heygen.com
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

## How to Use

1. **Open the Application**
   - Navigate to http://localhost:3000 in your browser
   - Select your desired agent scenario (chatSupervisor, customerServiceRetail, or simpleHandoff)

2. **Connect to Realtime API**
   - Click the "Connect" button in the bottom toolbar
   - Wait for the connection status to show "CONNECTED"

3. **Enable HeyGen Avatar**
   - Once connected, check the "HeyGen Avatar" checkbox in the bottom toolbar
   - The avatar video panel will appear on the left side
   - Wait a few seconds for the avatar to initialize (you'll see "● Connected" when ready)

4. **Start Talking**
   - Speak into your microphone (or use Push-to-Talk mode)
   - The OpenAI agent will process your voice and respond
   - The HeyGen avatar will automatically speak the agent's responses with lip-sync and animations

## Features Implemented

### Core Integration
- ✅ **`useHeyGenAvatar` Hook** - Custom React hook for managing HeyGen avatar lifecycle
- ✅ **Token Generation API** - Secure server-side token generation (`/api/get-access-token`)
- ✅ **Real-time Sync** - Automatic synchronization between OpenAI responses and avatar speech
- ✅ **UI Controls** - Toggle avatar on/off via checkbox in toolbar

### Avatar Configuration
The avatar is configured with:
- **Quality**: High (adjustable in code: High/Medium/Low)
- **Voice**: Default voice with excited emotion
- **Rate**: 1.0x speed (normal talking speed)
- **Language**: English

### Architecture
```
User Voice Input
    ↓
OpenAI Realtime API (STT + GPT Processing)
    ↓
Text Response Generated
    ↓
HeyGen Avatar Speaks Response (with lip-sync)
    ↓
Visual + Audio Output
```

## Customization

### Change Avatar Appearance
Edit `src/app/App.tsx` around line 94:
```typescript
const avatarControls = useHeyGenAvatar({
  avatarId: 'your_avatar_id', // Change to your HeyGen avatar ID
  quality: AvatarQuality.High,
  voice: {
    voiceId: 'your_voice_id', // Change to your preferred voice
    rate: 1.0,
    emotion: VoiceEmotion.EXCITED, // EXCITED | SERIOUS | FRIENDLY | SOOTHING | BROADCASTER
  },
});
```

### Adjust Avatar Quality
For better performance on slower connections, you can lower the quality:
```typescript
quality: AvatarQuality.Medium, // or AvatarQuality.Low
```

## Troubleshooting

### Avatar Not Loading
1. Check browser console for errors
2. Verify `HEYGEN_API_KEY` is set correctly in `.env`
3. Ensure your HeyGen account has available credits
4. Check network tab for failed API requests to `api.heygen.com`

### No Lip-Sync
1. Make sure the avatar has fully initialized (green "● Connected" indicator)
2. Check that assistant messages are appearing in the transcript
3. Look for HeyGen-related errors in browser console

### Audio/Video Issues
1. Grant microphone permissions when prompted
2. Ensure "Audio playback" is enabled in toolbar
3. Check video element is receiving media stream (inspect with DevTools)

## File Structure

```
src/app/
├── hooks/
│   └── useHeyGenAvatar.ts          # HeyGen avatar management hook
├── api/
│   └── get-access-token/
│       └── route.ts                # Token generation endpoint
├── App.tsx                         # Main app with avatar integration
└── components/
    └── BottomToolbar.tsx           # Updated with avatar toggle

HEYGEN_INTEGRATION.md               # Detailed integration guide
QUICKSTART_LOCAL.md                 # Local setup guide
```

## Next Steps

To enhance the integration further, you can:

1. **Add Avatar Selection**: Allow users to choose different avatars from a dropdown
2. **Voice Customization**: Let users select different voices and emotions
3. **Quality Settings**: Add UI controls for adjusting video quality
4. **Background Customization**: Use HeyGen's background customization features
5. **Recording**: Capture avatar sessions for playback
6. **Interrupt Handling**: Improve avatar interruption when user speaks

## API Reference

### `useHeyGenAvatar` Hook

```typescript
const {
  initialize,      // (videoElement, token) => Promise<void>
  speak,          // (text, options?) => Promise<void>
  stopAvatar,     // () => Promise<void>
  interrupt,      // () => Promise<void>
  isReady,        // boolean - avatar ready state
  isLoading,      // boolean - initialization loading state
  sessionId,      // string | null - current session ID
  avatar,         // StreamingAvatar | null - avatar instance
} = useHeyGenAvatar(config);
```

### Configuration Options

```typescript
interface HeyGenConfig {
  avatarId?: string;              // HeyGen avatar identifier
  quality?: AvatarQuality;        // High | Medium | Low
  voice?: {
    voiceId?: string;             // Voice identifier
    rate?: number;                // 0.5 - 2.0 (speech speed)
    emotion?: VoiceEmotion;       // EXCITED | SERIOUS | FRIENDLY | SOOTHING | BROADCASTER
  };
}
```

## Cost Considerations

- **OpenAI Realtime API**: ~$0.06 per minute (audio input) + $0.24 per minute (audio output)
- **HeyGen Avatar**: ~$0.33 per minute for streaming avatar
- **Total**: ~$0.63 per minute of conversation

For 1000 minutes of usage:
- OpenAI: ~$300/month
- HeyGen: ~$330/month
- **Total: ~$630/month**

Consider implementing session time limits and user quotas for production deployments.

## Support

For issues specific to:
- **OpenAI Integration**: Check the main README.md and OpenAI Realtime API docs
- **HeyGen Integration**: See HEYGEN_INTEGRATION.md and HeyGen documentation
- **Local Setup**: Refer to QUICKSTART_LOCAL.md

---

**Created with Claude Code** - Integration completed successfully! 🎉

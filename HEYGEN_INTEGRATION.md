# HeyGen + OpenAI Realtime API Integration Plan

## Overview

This document outlines the architecture for integrating HeyGen's Streaming Avatar SDK with OpenAI's Realtime API to create a real-time conversational avatar experience.

## Architecture Strategy

### Two Integration Approaches

#### Approach 1: OpenAI Realtime → HeyGen Avatar (Recommended)
**Flow**: User speaks → OpenAI Realtime API (STT + GPT) → Text response → HeyGen Avatar speaks

**Advantages**:
- Leverages OpenAI Realtime's superior voice activity detection and STT
- Uses existing agent infrastructure from this project
- More flexible conversation management
- Better latency for complex reasoning

**Implementation**:
```typescript
// OpenAI Realtime handles voice input → generates text response
// Pass response text to HeyGen avatar for visual output
session.on('response.text.done', async (event) => {
  const responseText = event.text;
  await heygenAvatar.speak({
    text: responseText,
    taskType: TaskType.REPEAT
  });
});
```

#### Approach 2: HeyGen Voice Chat → OpenAI Text API
**Flow**: User speaks → HeyGen STT → OpenAI API (text) → HeyGen Avatar speaks

**Advantages**:
- Single vendor for avatar + voice
- Simpler audio pipeline

**Disadvantages**:
- Loses OpenAI Realtime's advanced features
- Limited to HeyGen's STT providers (Deepgram)
- Can't use existing agent patterns

## Recommended Architecture: Hybrid Approach

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                        │
│  ┌─────────────────┐              ┌─────────────────────┐   │
│  │  Audio Input    │              │  HeyGen Avatar      │   │
│  │  (Microphone)   │              │  Video Stream       │   │
│  └─────────────────┘              └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                                    ▲
           ▼                                    │
┌─────────────────────────────────────────────────────────────┐
│              OpenAI Realtime API (WebRTC)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Speech-to-Text (Whisper)                          │  │
│  │  • Agent Logic (gpt-realtime)                        │  │
│  │  • Tool Calls & Context Management                   │  │
│  │  • Text Response Generation                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           │
           ▼ (text response)
┌─────────────────────────────────────────────────────────────┐
│           HeyGen Streaming Avatar SDK (WebRTC)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Receive text from OpenAI                          │  │
│  │  • Synthesize avatar speech & lip sync               │  │
│  │  • Stream video back to UI                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Integration Points

1. **Audio Input Flow**:
   - User speaks into microphone
   - Audio streams to OpenAI Realtime via WebRTC
   - OpenAI handles STT + conversation logic
   - **Audio is NOT sent to HeyGen** (HeyGen only receives text)

2. **Response Generation**:
   - OpenAI generates text response (with agent tools, context, etc.)
   - Text response intercepted from Realtime API events
   - Text passed to HeyGen avatar for visual rendering

3. **Visual Output**:
   - HeyGen avatar receives text
   - Generates lip-synced video with TTS
   - Streams video back to browser

## Implementation Plan

### Phase 1: Core Integration (Minimal Changes)

#### 1.1 Install HeyGen SDK
```bash
npm install @heygen/streaming-avatar livekit-client
```

#### 1.2 Environment Variables
Add to `.env`:
```bash
HEYGEN_API_KEY=your_heygen_api_key
```

#### 1.3 Create HeyGen Manager Hook
**File**: `src/app/hooks/useHeyGenAvatar.ts`

```typescript
import { StreamingAvatar, AvatarQuality, TaskType, VoiceEmotion } from '@heygen/streaming-avatar';
import { useCallback, useRef, useState } from 'react';

interface HeyGenConfig {
  apiKey: string;
  avatarId: string;
  voiceId?: string;
  quality?: AvatarQuality;
}

export function useHeyGenAvatar(config: HeyGenConfig) {
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const initialize = useCallback(async (videoElement: HTMLVideoElement) => {
    avatarRef.current = new StreamingAvatar({ token: config.apiKey });

    const sessionInfo = await avatarRef.current.createStartAvatar({
      quality: config.quality || AvatarQuality.High,
      avatarName: config.avatarId,
      voice: {
        voiceId: config.voiceId,
        rate: 1.0, // Normal speed
        emotion: VoiceEmotion.FRIENDLY
      },
      // Disable HeyGen's voice input since OpenAI handles it
      disableIdleTimeout: false,
    });

    setSessionId(sessionInfo.session_id);

    // Attach video stream to element
    avatarRef.current.on('stream_ready', (stream) => {
      if (videoElement && stream) {
        videoElement.srcObject = stream;
        videoElement.play();
        setIsReady(true);
      }
    });

    return sessionInfo;
  }, [config]);

  const speak = useCallback(async (text: string) => {
    if (!avatarRef.current || !sessionId) {
      console.error('Avatar not initialized');
      return;
    }

    await avatarRef.current.speak({
      text,
      taskType: TaskType.REPEAT, // Direct text-to-speech
      taskMode: 'sync'
    });
  }, [sessionId]);

  const stopAvatar = useCallback(async () => {
    if (avatarRef.current) {
      await avatarRef.current.stopAvatar();
      avatarRef.current = null;
      setIsReady(false);
      setSessionId(null);
    }
  }, []);

  return {
    initialize,
    speak,
    stopAvatar,
    isReady,
    sessionId,
    avatar: avatarRef.current
  };
}
```

#### 1.4 Update Main App Component
**File**: `src/app/App.tsx`

Add HeyGen avatar integration:

```typescript
import { useHeyGenAvatar } from './hooks/useHeyGenAvatar';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const heygenAvatar = useHeyGenAvatar({
    apiKey: process.env.NEXT_PUBLIC_HEYGEN_API_KEY!,
    avatarId: 'default_avatar', // Get from HeyGen dashboard
    quality: AvatarQuality.High
  });

  // Initialize HeyGen when connecting
  const handleConnect = async () => {
    if (videoRef.current) {
      await heygenAvatar.initialize(videoRef.current);
    }
    // Then connect OpenAI Realtime...
    await connectRealtimeSession();
  };

  // Intercept OpenAI responses and send to HeyGen
  useEffect(() => {
    if (!realtimeSession) return;

    const handleResponse = async (event: any) => {
      if (event.type === 'response.audio_transcript.done') {
        const responseText = event.transcript;

        // Send text to HeyGen avatar for visual rendering
        await heygenAvatar.speak(responseText);
      }
    };

    // Listen for OpenAI responses
    realtimeSession.on('response.audio_transcript.done', handleResponse);

    return () => {
      realtimeSession.off('response.audio_transcript.done', handleResponse);
    };
  }, [realtimeSession, heygenAvatar]);

  return (
    <div>
      {/* HeyGen Avatar Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', maxWidth: '800px' }}
      />

      {/* Existing UI */}
      {/* ... */}
    </div>
  );
}
```

### Phase 2: Enhanced Features

#### 2.1 Disable OpenAI Audio Output
Since HeyGen handles the visual/audio output:

```typescript
// In useRealtimeSession.ts
const session = new RealtimeSession(rootAgent, {
  config: {
    // Disable audio output from OpenAI
    turnDetection: { type: 'server_vad' },
    // Keep transcription for passing to HeyGen
    inputAudioTranscription: { model: 'gpt-4o-mini-transcribe' }
  },
  // Remove audioElement since HeyGen provides it
  transport: new OpenAIRealtimeWebRTC({
    audioElement: null, // Or create muted element
    // ...
  })
});
```

#### 2.2 Avatar State Synchronization
Track when avatar is speaking to prevent interruptions:

```typescript
export function useHeyGenAvatar(config: HeyGenConfig) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const initialize = useCallback(async (videoElement: HTMLVideoElement) => {
    // ... existing code ...

    avatarRef.current.on('avatar_start_talking', () => {
      setIsSpeaking(true);
    });

    avatarRef.current.on('avatar_stop_talking', () => {
      setIsSpeaking(false);
    });
  }, [config]);

  return {
    // ... existing returns ...
    isSpeaking
  };
}

// Use in App.tsx to disable user input while avatar speaks
```

#### 2.3 Add Avatar Selection UI
```typescript
const AVAILABLE_AVATARS = [
  { id: 'avatar_1', name: 'Professional Male' },
  { id: 'avatar_2', name: 'Professional Female' },
  // Add more from HeyGen dashboard
];

function AvatarSelector({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <select onChange={(e) => onSelect(e.target.value)}>
      {AVAILABLE_AVATARS.map(avatar => (
        <option key={avatar.id} value={avatar.id}>
          {avatar.name}
        </option>
      ))}
    </select>
  );
}
```

### Phase 3: Advanced Integration

#### 3.1 Emotion-Based Responses
Map agent context to avatar emotions:

```typescript
function getEmotionFromContext(agentContext: any): VoiceEmotion {
  // Analyze response sentiment or intent
  if (agentContext.includes('error') || agentContext.includes('problem')) {
    return VoiceEmotion.SERIOUS;
  }
  if (agentContext.includes('great') || agentContext.includes('success')) {
    return VoiceEmotion.EXCITED;
  }
  return VoiceEmotion.FRIENDLY;
}

await heygenAvatar.speak({
  text: responseText,
  emotion: getEmotionFromContext(context)
});
```

#### 3.2 Multi-Agent Avatar Mapping
Different avatars for different agent personas:

```typescript
const AGENT_AVATAR_MAP = {
  greeter: 'friendly_avatar_id',
  technical_support: 'professional_avatar_id',
  sales: 'energetic_avatar_id'
};

// When agent handoff occurs
session.on('agent_handoff', async (event) => {
  const newAvatarId = AGENT_AVATAR_MAP[event.agentName];

  // Stop current avatar
  await heygenAvatar.stopAvatar();

  // Start new avatar
  await heygenAvatar.initialize(videoRef.current, newAvatarId);
});
```

## API Configuration

### Required Credentials

1. **OpenAI API Key**: Already configured
   - Used for Realtime API access
   - Models: `gpt-realtime`, `gpt-4.1` (supervisor)

2. **HeyGen API Key**: New requirement
   - Get from: https://app.heygen.com/settings/api
   - Requires paid plan for streaming avatars
   - Add to `.env.local`:
     ```
     NEXT_PUBLIC_HEYGEN_API_KEY=your_key_here
     ```

### Avatar Configuration

1. **Create/Select Avatar**:
   - Go to HeyGen dashboard
   - Create or choose existing avatar
   - Copy Avatar ID

2. **Voice Selection**:
   - Browse HeyGen voice library
   - Select voice compatible with avatar
   - Copy Voice ID

## Testing Strategy

### Test Scenarios

1. **Basic Flow**:
   - User speaks: "Hello, how are you?"
   - OpenAI processes and responds
   - HeyGen avatar lip-syncs the response

2. **Agent Handoff**:
   - Test multi-agent scenarios
   - Verify avatar continues during handoff
   - Optional: Switch avatars per agent

3. **Tool Calls**:
   - Trigger tool execution
   - Ensure avatar waits during processing
   - Show "thinking" state on avatar

4. **Error Handling**:
   - HeyGen connection fails → fallback to audio-only
   - OpenAI timeout → avatar shows waiting state
   - Network issues → graceful degradation

## Performance Considerations

### Latency Optimization

1. **Parallel Initialization**:
   ```typescript
   // Start both connections simultaneously
   await Promise.all([
     connectOpenAI(),
     heygenAvatar.initialize(videoRef.current)
   ]);
   ```

2. **Response Streaming**:
   ```typescript
   // Send text chunks to HeyGen as they arrive
   session.on('response.text.delta', async (event) => {
     if (event.delta.length > 50) { // Chunk threshold
       await heygenAvatar.speak(event.delta);
     }
   });
   ```

3. **Quality Adjustment**:
   ```typescript
   // Lower avatar quality on slow connections
   const quality = navigator.connection?.effectiveType === '4g'
     ? AvatarQuality.High
     : AvatarQuality.Medium;
   ```

### Resource Management

- **Memory**: Properly cleanup both WebRTC connections
- **Bandwidth**: Avatar video uses ~2Mbps (high quality)
- **Concurrent Sessions**: HeyGen limits to 3 with trial token

## Security Best Practices

1. **API Keys**:
   - Never expose keys in client code
   - Use Next.js API routes for HeyGen token generation:

   ```typescript
   // pages/api/heygen-token.ts
   export async function POST(req: Request) {
     const token = await generateHeyGenToken(process.env.HEYGEN_API_KEY);
     return Response.json({ token });
   }
   ```

2. **Session Management**:
   - Set session timeouts
   - Cleanup on unmount/disconnect
   - Handle reconnection logic

## Cost Estimation

### HeyGen Pricing (as of 2025)
- **Starter**: ~$30/month - 15 minutes streaming
- **Business**: ~$149/month - 120 minutes streaming
- **Enterprise**: Custom pricing

### OpenAI Realtime API Pricing
- **gpt-realtime**: ~$0.06/minute audio input, $0.24/minute audio output
- **gpt-4.1**: ~$0.01-0.03 per 1K tokens

### Combined Cost Example (1000 minutes/month)
- HeyGen: ~$149 (Business plan)
- OpenAI Realtime: ~$60 (input) + $240 (output) = $300
- **Total**: ~$449/month for 1000 minutes

## Next Steps

1. ✅ Review this integration plan
2. ⬜ Set up HeyGen account and get API key
3. ⬜ Implement Phase 1 (Core Integration)
4. ⬜ Test basic conversation flow
5. ⬜ Implement Phase 2 (Enhanced Features)
6. ⬜ Performance testing and optimization
7. ⬜ Production deployment

## Resources

- [HeyGen Streaming SDK Docs](https://docs.heygen.com/docs/streaming-avatar-sdk)
- [HeyGen API Reference](https://docs.heygen.com/docs/streaming-avatar-sdk-reference)
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [HeyGen Demo Repository](https://github.com/HeyGen-Official/StreamingAvatarSDK)
- [Interactive Avatar Next.js Demo](https://github.com/HeyGen-Official/InteractiveAvatarNextJSDemo)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run lint` - Run ESLint on codebase

### Environment Setup
- Copy `.env.sample` to `.env` and add your `OPENAI_API_KEY`
- For HeyGen avatar integration, add `HEYGEN_API_KEY` to `.env`
- The app uses the `gpt-realtime` model (configured in `src/app/api/session/route.ts` and `src/app/hooks/useRealtimeSession.ts`)

## Architecture Overview

### Core Technology Stack
This is a Next.js application combining three major technologies:
1. **OpenAI Agents SDK** - Agent orchestration and tool execution
2. **OpenAI Realtime API** - Low-latency voice interaction via WebRTC
3. **HeyGen Streaming Avatar SDK** - Visual avatar with lip-sync (optional)

The project demonstrates voice-based AI agent patterns with optional visual representation.

1. **Chat-Supervisor Pattern** (`src/app/agentConfigs/chatSupervisor/`):
   - Realtime chat agent handles immediate responses and basic tasks
   - Text-based supervisor agent (`gpt-4.1`) handles complex queries via tool calls
   - Uses `getNextResponseFromSupervisor` tool to delegate intelligence-heavy tasks

2. **Sequential Handoff Pattern** (`src/app/agentConfigs/customerServiceRetail/`, `src/app/agentConfigs/simpleHandoff.ts`):
   - Specialized agents for different domains (authentication, returns, sales)
   - Agent handoffs coordinated via tool calls and session updates
   - State machine-driven conversation flows for structured interactions

### Core Components

**Agent Configuration System** (`src/app/agentConfigs/`):
- `index.ts` - Central registry mapping scenario keys to agent arrays
- Each scenario exports an array of `RealtimeAgent` objects with tools and handoff definitions
- Add new scenarios here and they appear in the UI dropdown

**WebRTC Session Management** (`src/app/hooks/useRealtimeSession.ts`):
- Manages WebRTC connection to OpenAI Realtime API
- Handles audio codec selection (Opus 48kHz, PCMU/PCMA 8kHz for phone simulation)
- Coordinates agent handoffs and session state

**API Endpoints**:
- `/api/session` - Creates ephemeral tokens for WebRTC connections with `gpt-realtime` model
- `/api/responses` - Proxy for OpenAI Responses API (used by supervisor agents and guardrails)
  - Handles both structured responses (JSON schema) and text responses
  - Used by supervisor agents with `gpt-4.1` model for complex decision making
- `/api/health` - Health check endpoint

**UI Architecture**:
- `src/app/App.tsx` - Main application with scenario/agent selection
- `src/app/components/Transcript.tsx` - Real-time conversation display
- `src/app/components/Events.tsx` - Debug event log viewer
- Real-time guardrails integration via `createModerationGuardrail`

### Key Concepts

**Agent Tools**: Functions that agents can call are defined with the `tool()` helper from `@openai/agents/realtime`. Tools can execute async logic and return structured data.

**Handoff Configuration**: Agents define which other agents they can transfer to via the `handoffs` array. The SDK automatically provides transfer tools based on this configuration.

**Session Context**: The `RealtimeSession` maintains conversation history and agent state. Context is passed to tools via the `details.context` parameter.

**Guardrails**: Output moderation is handled via `outputGuardrails` in session configuration. The `createModerationGuardrail()` function uses `gpt-4o-mini` to classify messages for offensive content, off-brand messaging, and violence. Failed guardrails trigger correction flows and emit `guardrail_tripped` events.

## Agent Development

### Creating New Agents
1. Create new file in `src/app/agentConfigs/[scenarioName]/`
2. Define `RealtimeAgent` with instructions, tools, and handoff targets
3. Export scenario array and add to `src/app/agentConfigs/index.ts`
4. Agent will appear in UI scenario dropdown

### Tool Implementation
Tools should return structured data and use the `details.context` for accessing conversation history and other agents' context. For complex tool logic, consider using the Chat-Supervisor pattern to delegate to a text model.

**Important patterns**:
- Use the `tool()` helper from `@openai/agents/realtime` to define tools
- Access conversation history via `details.context.history`
- For supervisor tools, use `/api/responses` endpoint to call `gpt-4.1` with conversation context
- Tools can be async and should handle errors gracefully

### State Machines
For structured conversations (like the authentication flow), define conversation states in agent instructions with clear transition conditions and validation steps.

## Model Configuration
The application uses `gpt-realtime` model by default. Model references are in:
- `src/app/api/session/route.ts` (session creation)
- `src/app/hooks/useRealtimeSession.ts` (WebRTC session config)

## Testing Scenarios
- **chatSupervisor** (default): Cocoa AI demo with Mario, an AI consultant. Tests chat-supervisor delegation pattern with tool calls about AI solutions, implementation strategies, and business requirements
- **customerServiceRetail**: Test multi-agent handoffs and state machines (try "I want to return my snowboard")
- **simpleHandoff**: Test basic agent transfer (greeter → haiku writer)

## Audio Codec Configuration
- Default codec: Opus 48kHz (high quality)
- Phone simulation: PCMU/PCMA 8kHz (add `?codec=pcmu` or `?codec=pcma` to URL)
- Codec selection handled in `src/app/lib/codecUtils.ts` and applied via `useRealtimeSession.ts`

## HeyGen Avatar Integration

This repository includes integration with HeyGen's Streaming Avatar SDK for visual avatar representation. The integration uses a **dual-mode architecture** that can be toggled via UI checkbox:

### Two Operating Modes

**Standard Voice Mode** (Avatar disabled):
- User speaks → OpenAI Realtime API → OpenAI voice output
- Traditional voice-only conversation with audio playback

**Avatar Mode** (Avatar enabled):
- User speaks → OpenAI Realtime API (STT + agent logic) → HeyGen Avatar SDK (TTS + video)
- OpenAI handles: Speech recognition, agent intelligence, tool calls, text response generation
- HeyGen handles: Text-to-speech with lip-synced video output
- OpenAI audio output is muted, avatar provides both voice and visual
- Microphone input remains active through OpenAI SDK

### Architecture Pattern

The integration follows this flow:
1. **User voice input** → OpenAI Realtime API (speech-to-text + agent logic)
2. **OpenAI text response** → HeyGen Streaming Avatar SDK
3. **Avatar output** → Visual video stream with lip-synced speech

### Key Components

**HeyGen Hook** (`src/app/hooks/useHeyGenAvatar.ts`):
- Manages HeyGen avatar lifecycle (initialization, speech, cleanup)
- Handles WebRTC connection to HeyGen streaming service
- Provides event listeners for avatar state (talking, ready, disconnected)
- Exposes `speak()` method to send text for avatar vocalization
- **Critical**: Waits for `STREAM_READY` event before attaching video stream (prevents black screen issues)

**Token Generation** (`src/app/api/get-access-token/route.ts`):
- Server-side API endpoint for generating HeyGen session tokens
- Uses `HEYGEN_API_KEY` from environment variables
- Returns ephemeral tokens for client-side avatar connections

**Audio Mode Separation** (`src/app/App.tsx` lines 401-457):
- Completely separate audio handling for each mode
- Avatar mode: `mute(false)` keeps SDK active for mic input
- Avatar mode: `audioElement.muted = true` silences OpenAI voice
- Standard mode: Normal audio playback controls apply

### Environment Setup

Add to `.env`:
```
HEYGEN_API_KEY=your_heygen_api_key_here
```

Get your HeyGen API key from: https://app.heygen.com/settings/api

### Avatar Configuration

**Current Configuration** (`src/app/App.tsx` line 96):
- Avatar ID: `Wayne_20240711` (public HeyGen avatar - Mario from Cocoa AI)
- Quality: `AvatarQuality.High`
- Voice emotion: `VoiceEmotion.FRIENDLY`
- Voice rate: 1.0 (normal speed)

**Finding Avatars**:
- Use `/api/list-avatars` endpoint (created for this project)
- Check HeyGen dashboard at https://app.heygen.com/streaming-avatar
- See `HEYGEN_INTEGRATION.md` for detailed avatar information
- **Important**: Not all avatar IDs work reliably - test before using in production

### Integration Points

**Response Interception** (`src/app/App.tsx` lines 504-540):
- Monitors transcript for new assistant messages
- Filters out duplicate/in-progress messages
- Sends complete responses to avatar via `avatarControls.speak(text)`
- Handles sentence chunking for natural speech

**UI Components** (`src/app/App.tsx` lines 640-688):
- Avatar video panel with loading states
- Status indicators: "Initializing...", "● Loading...", "● Connected"
- Close button to disable avatar mode
- Graceful loading overlay while avatar initializes

### Critical Implementation Details

**Preventing Re-initialization Loop**:
- `useEffect` dependency array: `[avatarEnabled, avatarControls.isReady, avatarControls.isLoading]`
- `isLoading` check prevents duplicate initialization attempts
- `isMounted` flag prevents state updates after component unmount

**Audio Routing Logic**:
- Avatar mode sets `mute(false)` to keep microphone active
- Only mutes the audio OUTPUT element, not the SDK input
- Separate logic paths for avatar vs. standard mode prevent conflicts

**Error Handling**:
- Comprehensive logging with `[HeyGen]` prefix for debugging
- Detailed error objects with full response inspection
- Graceful degradation if avatar fails to initialize

### Testing Avatar Mode

1. Connect to OpenAI Realtime session
2. Enable "HeyGen Avatar" checkbox
3. Wait for "● Connected" status
4. Speak into microphone - avatar should respond with lip-sync
5. Toggle checkbox to switch between modes

### Known Limitations

- HeyGen requires paid plan ($99/mo recommended for production use)
- Free tier has strict quota limits (10 credits / 50 minutes)
- Avatar initialization takes 3-5 seconds
- Network bandwidth: ~2Mbps for high-quality avatar video

### Troubleshooting

**Avatar shows black screen**:
- Check browser console for `[HeyGen]` error logs
- Verify `HEYGEN_API_KEY` is set correctly
- Check quota limits at https://app.heygen.com/settings/api

**Voice input not working in avatar mode**:
- Ensure "Audio playback" is checked (required for SDK to stay active)
- Check that `mute(false)` is being called in avatar mode
- Verify microphone permissions in browser

**Avatar flickers or re-initializes**:
- Check for infinite re-render loops in `useEffect` dependencies
- Verify `isLoading` check is preventing duplicate initialization
- Check console for re-initialization warnings

## Cocoa AI Demo Customization

The default `chatSupervisor` scenario has been customized as a demo for **Cocoa AI**, an AI consulting company. This demonstrates how to rebrand the application for different use cases.

### Demo Configuration
- **Agent Name**: Mario (AI consultant at Cocoa AI)
- **Avatar**: `Wayne_20240711` with friendly, professional tone
- **Domain**: AI consulting and business solutions (not telecom customer service)
- **Company**: Cocoa AI - helps businesses leverage AI technology

### Key Files for Customization

**Agent Instructions** (`src/app/agentConfigs/chatSupervisor/index.ts`):
- `chatAgent` - Mario's personality, greeting, and behavior
- Greeting: "Hi, I'm Mario from Cocoa AI. How can I help you with your AI needs today?"
- Self-aware: Can explain that he's a demonstration of Cocoa AI's conversational AI technology

**Supervisor Agent** (`src/app/agentConfigs/chatSupervisor/supervisorAgent.ts`):
- `supervisorAgentInstructions` - Expert AI consulting guidance for Mario
- `supervisorAgentTools` - AI-specific tools (lookupAISolutions, getBusinessRequirements, findImplementationPath)
- Tool response handler with intelligent filtering by topic/solution type

**Sample Data** (`src/app/agentConfigs/chatSupervisor/sampleData.ts`):
- `exampleAISolutions` - 6 AI solution types (conversational AI, automation, analytics, custom models, etc.)
- `exampleBusinessRequirements` - Industries served, use cases, implementation approaches, success metrics
- `exampleImplementationPaths` - Timeline details, phases, requirements, and ROI for different solution types

### Customizing for Your Own Brand

To adapt this demo for another company/use case:
1. Update agent name and greeting in `chatAgent.instructions`
2. Modify `supervisorAgentInstructions` to reflect your domain
3. Rename and update tools in `supervisorAgentTools` to match your services
4. Replace sample data in `sampleData.ts` with your offerings
5. Update `chatSupervisorCompanyName` for guardrails
6. Optionally change avatar ID in `App.tsx` (test avatar availability first)

**Important**: When changing avatar IDs, use HeyGen's `/api/streaming.avatar.list` endpoint to verify avatar availability. Some avatars may not work - test thoroughly. The `Wayne_20240711` avatar is reliable and proven to work.
import { useCallback, useRef, useState } from 'react';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
  TaskMode,
  VoiceEmotion,
} from '@heygen/streaming-avatar';

export interface HeyGenConfig {
  avatarId?: string;
  quality?: AvatarQuality;
  voice?: {
    voiceId?: string;
    rate?: number;
    emotion?: VoiceEmotion;
  };
}

export interface HeyGenAvatarControls {
  initialize: (videoElement: HTMLVideoElement, token: string) => Promise<void>;
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stopAvatar: () => Promise<void>;
  interrupt: () => Promise<void>;
  isReady: boolean;
  isLoading: boolean;
  sessionId: string | null;
  avatar: StreamingAvatar | null;
  videoElement: HTMLVideoElement | null;
}

export interface SpeakOptions {
  taskType?: TaskType;
  taskMode?: TaskMode;
}

export function useHeyGenAvatar(config: HeyGenConfig = {}): HeyGenAvatarControls {
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const initialize = useCallback(
    async (videoElement: HTMLVideoElement, token: string) => {
      if (avatarRef.current) {
        console.warn('Avatar already initialized');
        return;
      }

      try {
        setIsLoading(true);

        // Store video element reference
        videoElementRef.current = videoElement;

        // Create avatar instance
        console.log('[HeyGen] Creating avatar with token:', token.substring(0, 20) + '...');
        const avatar = new StreamingAvatar({ token });
        avatarRef.current = avatar;

        // Set up event listeners
        avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
          console.log('[HeyGen] Avatar started talking');
        });

        avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          console.log('[HeyGen] Avatar stopped talking');
        });

        avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
          console.log('[HeyGen] Stream disconnected');
          setIsReady(false);
          setSessionId(null);
        });

        avatar.on(StreamingEvents.STREAM_READY, (event) => {
          console.log('[HeyGen] Stream ready event received:', event);

          // Attach stream to video element when it becomes available
          if (videoElementRef.current && avatar.mediaStream) {
            console.log('[HeyGen] Attaching stream to video element from STREAM_READY event');
            videoElementRef.current.srcObject = avatar.mediaStream;
            videoElementRef.current.play()
              .then(() => {
                console.log('[HeyGen] Video playback started successfully');
                setIsReady(true);
              })
              .catch((err) => {
                console.error('[HeyGen] Failed to play video:', err);
                setIsReady(true); // Still mark as ready even if autoplay fails
              });
          } else {
            console.warn('[HeyGen] Stream ready but video element or mediaStream not available');
            setIsReady(true);
          }
        });

        // Start avatar session
        console.log('[HeyGen] Starting avatar session with config:', {
          avatarName: config.avatarId || 'Wayne_20240711',
          quality: config.quality || AvatarQuality.High,
        });

        const session = await avatar.createStartAvatar({
          quality: config.quality || AvatarQuality.High,
          avatarName: config.avatarId || 'Wayne_20240711',
          voice: {
            voiceId: config.voice?.voiceId,
            rate: config.voice?.rate || 1.0,
            emotion: config.voice?.emotion || VoiceEmotion.EXCITED,
          },
          language: 'en',
          activityIdleTimeout: 600, // 10 minutes
        });

        console.log('[HeyGen] Avatar session created:', session);
        setSessionId(session.session_id);

        // Note: Don't attach stream here - wait for STREAM_READY event
        // The mediaStream becomes available asynchronously
        console.log('[HeyGen] Waiting for STREAM_READY event to attach video...');

        console.log('[HeyGen] Avatar session initialized:', session.session_id);
      } catch (error: any) {
        console.error('[HeyGen] Failed to initialize avatar - Full error:', error);
        console.error('[HeyGen] Error details:', {
          type: typeof error,
          constructor: error?.constructor?.name,
          message: error?.message,
          stack: error?.stack,
          response: error?.response,
          data: error?.data,
          toString: error?.toString?.(),
          keys: Object.keys(error || {}),
        });

        // Try to extract more details
        if (error && typeof error === 'object') {
          console.error('[HeyGen] Error properties:', JSON.stringify(error, null, 2));
        }

        avatarRef.current = null;
        setIsReady(false);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [config]
  );

  const speak = useCallback(
    async (text: string, options: SpeakOptions = {}) => {
      if (!avatarRef.current || !sessionId) {
        console.warn('[HeyGen] Avatar not initialized, cannot speak');
        return;
      }

      try {
        await avatarRef.current.speak({
          text,
          taskType: options.taskType || TaskType.REPEAT,
          taskMode: options.taskMode || TaskMode.SYNC,
        });
      } catch (error) {
        console.error('[HeyGen] Failed to speak:', error);
        throw error;
      }
    },
    [sessionId]
  );

  const interrupt = useCallback(async () => {
    if (!avatarRef.current || !sessionId) {
      return;
    }

    try {
      await avatarRef.current.interrupt();
      console.log('[HeyGen] Avatar interrupted');
    } catch (error) {
      console.error('[HeyGen] Failed to interrupt avatar:', error);
    }
  }, [sessionId]);

  const stopAvatar = useCallback(async () => {
    if (!avatarRef.current) {
      return;
    }

    try {
      await avatarRef.current.stopAvatar();
      avatarRef.current = null;
      setIsReady(false);
      setSessionId(null);
      console.log('[HeyGen] Avatar stopped');
    } catch (error) {
      console.error('[HeyGen] Failed to stop avatar:', error);
    }
  }, []);

  return {
    initialize,
    speak,
    stopAvatar,
    interrupt,
    isReady,
    isLoading,
    sessionId,
    avatar: avatarRef.current,
    videoElement: videoElementRef.current,
  };
}

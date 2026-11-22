import { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface YouTubeAudioEngineProps {
  videoId: string | null;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  seekRequest: { seconds: number; nonce: number } | null;
  showVideoFrame: boolean;
  onCloseVideoFrame: () => void;
  onProgress: (currentTime: number, duration: number) => void;
  onPlaybackStateChange: (playing: boolean, buffering: boolean) => void;
  onEnded: () => void;
  onPlaybackError: (code: number) => void;
  trackTitle?: string;
}

export function YouTubeAudioEngine({
  videoId,
  isPlaying,
  volume,
  muted,
  seekRequest,
  showVideoFrame,
  onCloseVideoFrame,
  onProgress,
  onPlaybackStateChange,
  onEnded,
  onPlaybackError,
  trackTitle,
}: YouTubeAudioEngineProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerReadyRef = useRef(false);
  const playerStateRef = useRef<number>(-1);
  const lastVideoIdRef = useRef<string | null>(null);
  const initialAutoplayRef = useRef<number>(1);

  if (videoId !== lastVideoIdRef.current) {
    lastVideoIdRef.current = videoId;
    initialAutoplayRef.current = isPlaying ? 1 : 0;
    playerReadyRef.current = false;
    playerStateRef.current = -1;
  }

  const callbacksRef = useRef({
    onProgress,
    onPlaybackStateChange,
    onEnded,
    onPlaybackError,
  });
  callbacksRef.current = {
    onProgress,
    onPlaybackStateChange,
    onEnded,
    onPlaybackError,
  };

  const desiredRef = useRef({ isPlaying, volume, muted });
  desiredRef.current = { isPlaying, volume, muted };

  const sendCommand = useCallback((func: string, args: unknown[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args,
        }),
        '*'
      );
    } catch {
      // Ignore cross-origin postMessage errors during frame transitions
    }
  }, []);

  const registerListener = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({
          event: 'listening',
          id: 1,
          channel: 'widget',
        }),
        '*'
      );
    } catch {
      // Ignore
    }
  }, []);

  // Listen for YouTube embed postMessage events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        typeof event.origin !== 'string' ||
        (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com'))
      ) {
        return;
      }

      let data: Record<string, unknown> | null = null;
      if (typeof event.data === 'string') {
        try {
          data = JSON.parse(event.data) as Record<string, unknown>;
        } catch {
          return;
        }
      } else if (event.data && typeof event.data === 'object') {
        data = event.data as Record<string, unknown>;
      }

      if (!data) return;

      const eventName = data.event;

      if (eventName === 'onReady') {
        playerReadyRef.current = true;
        sendCommand('setVolume', [desiredRef.current.volume]);
        sendCommand(desiredRef.current.muted ? 'mute' : 'unMute');
        if (desiredRef.current.isPlaying) {
          sendCommand('playVideo');
        }
      } else if (eventName === 'infoDelivery' && data.info && typeof data.info === 'object') {
        const info = data.info as Record<string, unknown>;

        if (typeof info.currentTime === 'number' || typeof info.duration === 'number') {
          const cur = typeof info.currentTime === 'number' ? info.currentTime : 0;
          const dur = typeof info.duration === 'number' ? info.duration : 0;
          callbacksRef.current.onProgress(cur, dur);
        }

        if (typeof info.playerState === 'number') {
          const state = info.playerState;
          if (state !== playerStateRef.current) {
            playerStateRef.current = state;
            if (state === 0) {
              callbacksRef.current.onPlaybackStateChange(false, false);
              callbacksRef.current.onEnded();
            } else if (state === 1) {
              callbacksRef.current.onPlaybackStateChange(true, false);
            } else if (state === 2) {
              callbacksRef.current.onPlaybackStateChange(false, false);
            } else if (state === 3) {
              callbacksRef.current.onPlaybackStateChange(desiredRef.current.isPlaying, true);
            }
          }
        }
      } else if (eventName === 'onStateChange' && typeof data.info === 'number') {
        const state = data.info;
        playerStateRef.current = state;
        if (state === 0) {
          callbacksRef.current.onPlaybackStateChange(false, false);
          callbacksRef.current.onEnded();
        } else if (state === 1) {
          callbacksRef.current.onPlaybackStateChange(true, false);
        } else if (state === 2) {
          callbacksRef.current.onPlaybackStateChange(false, false);
        } else if (state === 3) {
          callbacksRef.current.onPlaybackStateChange(desiredRef.current.isPlaying, true);
        }
      } else if (eventName === 'onError' && typeof data.info === 'number') {
        callbacksRef.current.onPlaybackError(data.info);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendCommand]);

  // Periodically ensure widget handshake is established for current videoId
  useEffect(() => {
    if (!videoId) return;
    const id = window.setInterval(() => {
      if (!playerReadyRef.current) {
        registerListener();
      }
    }, 450);
    return () => window.clearInterval(id);
  }, [videoId, registerListener]);

  // Play / Pause sync
  useEffect(() => {
    if (!videoId || !playerReadyRef.current) return;
    if (isPlaying && playerStateRef.current !== 1 && playerStateRef.current !== 3) {
      sendCommand('playVideo');
    } else if (!isPlaying && (playerStateRef.current === 1 || playerStateRef.current === 3)) {
      sendCommand('pauseVideo');
    }
  }, [isPlaying, videoId, sendCommand]);

  // Volume & Mute sync
  useEffect(() => {
    if (!videoId || !playerReadyRef.current) return;
    sendCommand('setVolume', [volume]);
    sendCommand(muted ? 'mute' : 'unMute');
  }, [volume, muted, videoId, sendCommand]);

  // Seek sync
  useEffect(() => {
    if (!videoId || !seekRequest) return;
    sendCommand('seekTo', [seekRequest.seconds, true]);
  }, [seekRequest, videoId, sendCommand]);

  if (!videoId) {
    return null;
  }

  const embedSrc = `https://www.youtube.com/embed/${encodeURIComponent(
    videoId
  )}?enablejsapi=1&autoplay=${initialAutoplayRef.current}&controls=1&rel=0&playsinline=1&modestbranding=1`;

  return (
    <div
      className={
        showVideoFrame
          ? 'fixed bottom-24 right-4 sm:right-6 z-40 w-[320px] sm:w-[380px] rounded-xl overflow-hidden bg-[#141418] border border-white/[0.12] shadow-2xl'
          : 'fixed -left-[9999px] top-0 w-[280px] h-[158px] pointer-events-none opacity-0'
      }
      aria-hidden={!showVideoFrame}
    >
      {showVideoFrame && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#18181F] border-b border-white/[0.08]">
          <span className="text-xs font-medium text-zinc-200 truncate pr-2">
            {trackTitle || 'Music Video'}
          </span>
          <button
            type="button"
            onClick={onCloseVideoFrame}
            aria-label="Minimize video"
            className="p-1 text-zinc-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="aspect-video w-full bg-black">
        <iframe
          key={videoId}
          ref={iframeRef}
          title={trackTitle || 'YouTube Music Player'}
          src={embedSrc}
          onLoad={() => {
            playerReadyRef.current = true;
            registerListener();
            sendCommand('setVolume', [desiredRef.current.volume]);
            sendCommand(desiredRef.current.muted ? 'mute' : 'unMute');
            if (desiredRef.current.isPlaying) {
              sendCommand('playVideo');
            }
          }}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, Send, AlertCircle } from 'lucide-react';

export default function VoiceRecorder({ onSend, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Stop any live mic stream / timer if this instance goes away mid-recording
  // (e.g. the parent swaps it out), so we never leak an open microphone.
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    setError(null);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow it in your browser settings to record.'
          : 'No microphone found on this device.'
      );
      return;
    }

    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (chunksRef.current.length === 0) {
        setError('Recording was empty. Please try again.');
        setRecording(false);
        return;
      }
      setBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
    };
    recorder.onerror = () => {
      setError('Recording failed. Please try again.');
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const reset = () => {
    setBlob(null);
    setSeconds(0);
    setError(null);
    onCancel();
  };

  const send = () => {
    if (!blob) return;
    onSend(new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }));
    setBlob(null);
    setSeconds(0);
  };

  if (!recording && !blob) {
    return (
      <div className="relative flex items-center">
        <button onClick={start} aria-label="Record voice message" className="text-aurora-text-muted hover:text-aurora-violet">
          <Mic size={20} />
        </button>
        {error && (
          <span className="absolute bottom-full right-0 mb-2 flex w-56 max-w-[calc(100vw-2rem)] items-start gap-1.5 rounded-aurora-sm border border-aurora-border bg-aurora-card px-3 py-2 text-xs text-aurora-like shadow-aurora">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-3 rounded-full border border-aurora-border bg-aurora-bg px-4 py-2">
      {recording ? (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-aurora-like" />
          <span className="flex-1 text-sm text-aurora-text">Recording… {seconds}s</span>
          <button onClick={stop} aria-label="Stop recording" className="text-aurora-like">
            <Square size={18} />
          </button>
        </>
      ) : blob ? (
        <>
          {/* w-full min-w-0 keeps the native player inside the pill instead of
              overflowing it — the browser's default <audio> width ignores flex-basis. */}
          <audio src={URL.createObjectURL(blob)} controls className="h-8 w-full min-w-0 flex-1" />
          <button onClick={reset} aria-label="Discard" className="flex-shrink-0 text-aurora-text-muted">
            <Trash2 size={16} />
          </button>
          <button onClick={send} aria-label="Send voice message" className="flex-shrink-0 text-aurora-violet">
            <Send size={18} />
          </button>
        </>
      ) : (
        <span className="flex-1 text-sm text-aurora-like">{error}</span>
      )}
    </div>
  );
}

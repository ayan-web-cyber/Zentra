import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send, AlertCircle, X, Pencil, Reply as ReplyIcon } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import VoiceRecorder from './VoiceRecorder';

let typingTimeout = null;

export default function MessageComposer({
  conversationId,
  onSent,
  onEdited,
  disabled = false,
  disabledMessage,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Loads the message being edited into the composer, and focuses it — the whole point
  // of "edit" is picking up where the original text left off, not retyping it.
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '');
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  const emitTyping = (isTyping) => {
    getSocket()?.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
  };

  const onTextChange = (e) => {
    setText(e.target.value);
    setError(null);
    emitTyping(true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => emitTyping(false), 1500);
  };

  const sendViaSocket = (payload) =>
    new Promise((resolve) => {
      getSocket()?.emit('message:send', { conversationId, ...payload }, resolve);
    });

  const saveEdit = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const { data } = await api.put(`/messages/${editingMessage._id}`, { text: body });
      onEdited?.(data.message);
      setText('');
      onCancelEdit?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save that edit.');
    } finally {
      setSending(false);
    }
  };

  const sendText = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const body = text;
    const replyTo = replyingTo?._id;
    setText('');
    emitTyping(false);
    const result = await sendViaSocket({ type: 'text', text: body, replyTo });
    if (result?.success) {
      onSent(result.message);
      onCancelReply?.();
    } else {
      setError(result?.message || 'Could not send that message.');
      setText(body); // give the text back so it isn't lost
    }
    setSending(false);
  };

  const handleSubmit = () => {
    if (editingMessage) return saveEdit();
    return sendText();
  };

  const sendFile = async (file, type) => {
    setSending(true);
    setError(null);
    setUploadProgress(0);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'message');
      const { data } = await api.post('/media/upload', form, {
        onUploadProgress: (evt) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      const result = await sendViaSocket({ type, mediaId: data.media.id, replyTo: replyingTo?._id });
      if (result?.success) {
        onSent(result.message);
        onCancelReply?.();
      } else {
        // Upload succeeded but the socket rejected the send (e.g. blocked mid-flight)
        setError(result?.message || 'Could not send that message.');
      }
    } catch (err) {
      // Upload itself failed — file too large, wrong type, or a dropped connection.
      // Without this, a failed voice/photo/video/file send just vanished with no feedback.
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setSending(false);
      setUploadProgress(null);
    }
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after an error
    if (!file) return;

    // 25MB matches the server's default MAX_UPLOAD_SIZE_MB — failing fast here avoids a
    // pointless upload attempt that the server would reject anyway.
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError('That file is too large. The limit is 25MB.');
      return;
    }

    const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : 'file';
    sendFile(file, type);
  };

  if (disabled) {
    return (
      <div className="border-t border-aurora-border px-4 py-3 text-center text-xs text-aurora-text-muted">
        {disabledMessage || "You can't send messages in this conversation."}
      </div>
    );
  }

  return (
    <div className="border-t border-aurora-border">
      {editingMessage && (
        <div className="flex items-center gap-2 border-b border-aurora-border bg-aurora-bg px-4 py-2">
          <Pencil size={14} className="flex-shrink-0 text-aurora-violet" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-aurora-violet">Editing message</p>
          </div>
          <button
            onClick={() => {
              setText('');
              onCancelEdit?.();
            }}
            aria-label="Cancel edit"
            className="flex-shrink-0 text-aurora-text-muted hover:text-aurora-text"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {replyingTo && !editingMessage && (
        <div className="flex items-center gap-2 border-b border-aurora-border bg-aurora-bg px-4 py-2">
          <ReplyIcon size={14} className="flex-shrink-0 text-aurora-cyan" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-aurora-cyan">Replying to {replyingTo.sender?.name}</p>
            <p className="truncate text-xs text-aurora-text-muted">
              {replyingTo.text?.slice(0, 80) || `a ${replyingTo.type} message`}
            </p>
          </div>
          <button onClick={onCancelReply} aria-label="Cancel reply" className="flex-shrink-0 text-aurora-text-muted hover:text-aurora-text">
            <X size={16} />
          </button>
        </div>
      )}

      {uploadProgress !== null && (
        <div className="px-4 pt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-aurora-bg">
            <div className="h-full bg-aurora-gradient transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 px-4 pt-2 text-xs text-aurora-like">
          <AlertCircle size={13} className="flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-3">
        {!editingMessage && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
              className="text-aurora-text-muted hover:text-aurora-violet"
            >
              <Paperclip size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
              hidden
              onChange={onPickFile}
            />
          </>
        )}

        <input
          ref={inputRef}
          value={text}
          onChange={onTextChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={editingMessage ? 'Edit message…' : 'Type a message…'}
          className="flex-1 rounded-full border border-aurora-border bg-aurora-bg px-4 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
        />

        {text.trim() ? (
          <button onClick={handleSubmit} disabled={sending} aria-label={editingMessage ? 'Save edit' : 'Send'} className="text-aurora-violet disabled:opacity-50">
            <Send size={20} />
          </button>
        ) : editingMessage ? (
          <button
            onClick={() => {
              setText('');
              onCancelEdit?.();
            }}
            className="text-xs font-medium text-aurora-text-muted hover:text-aurora-text"
          >
            Cancel
          </button>
        ) : (
          <VoiceRecorder onSend={(file) => sendFile(file, 'voice')} onCancel={() => setError(null)} />
        )}
      </div>
    </div>
  );
}

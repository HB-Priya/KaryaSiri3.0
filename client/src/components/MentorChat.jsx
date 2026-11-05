import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useAnnounce } from '../context/AnnounceContext';
import { useSpeech } from '../hooks/useSpeech';
import { useDictation } from '../hooks/useDictation';

// ---------------------------------------------------------------------------
// Lightweight, SAFE markdown handling.
//
// The mentor's replies come from an LLM, which habitually formats with
// Markdown (**bold**, "- " bullet lists, "1." numbered lists, "# " headings).
// Rendering that as raw text is what made the chat show literal "**" symbols.
// Instead of pulling in a markdown library (or using dangerouslySetInnerHTML),
// this converts the small subset the mentor actually uses into real React
// elements. Anything unrecognised is shown as plain text, never as HTML.
// ---------------------------------------------------------------------------

const INLINE_TOKEN = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\s][^*\n]*\*|`[^`\n]+`)/g;

function renderInline(text, keyPrefix) {
  const out = [];
  let last = 0;
  let match;
  let n = 0;
  INLINE_TOKEN.lastIndex = 0;
  const pushPlain = (chunk) => {
    // Drop any leftover, unpaired markdown markers so no stray "*" or "**"
    // ever reaches the screen.
    const clean = chunk.replace(/\*+/g, '').replace(/__+/g, '');
    if (clean) out.push(clean);
  };
  while ((match = INLINE_TOKEN.exec(text)) !== null) {
    if (match.index > last) pushPlain(text.slice(last, match.index));
    const tok = match[0];
    const key = `${keyPrefix}-${n++}`;
    if (tok.startsWith('**') || tok.startsWith('__')) {
      out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('`')) {
      out.push(<code key={key}>{tok.slice(1, -1)}</code>);
    } else {
      out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    }
    last = match.index + tok.length;
  }
  if (last < text.length) pushPlain(text.slice(last));
  return out;
}

function renderMarkdown(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let para = [];
  let list = null; // { type: 'ul' | 'ol', items: [] }

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', lines: para });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  lines.forEach((raw) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      return;
    }
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ type: 'h', text: heading[1] });
    } else if (bullet) {
      flushPara();
      if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
      list.items.push(bullet[1]);
    } else if (numbered) {
      flushPara();
      if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; }
      list.items.push(numbered[1]);
    } else {
      flushList();
      para.push(line.trim());
    }
  });
  flushPara();
  flushList();

  return blocks.map((b, i) => {
    if (b.type === 'h') {
      return <p key={i} className="mentor-heading"><strong>{renderInline(b.text, `h${i}`)}</strong></p>;
    }
    if (b.type === 'ul' || b.type === 'ol') {
      const Tag = b.type;
      return (
        <Tag key={i}>
          {b.items.map((it, j) => <li key={j}>{renderInline(it, `l${i}-${j}`)}</li>)}
        </Tag>
      );
    }
    return (
      <p key={i}>
        {b.lines.map((ln, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {renderInline(ln, `p${i}-${j}`)}
          </span>
        ))}
      </p>
    );
  });
}

// Plain-text version for text-to-speech and screen-reader announcements, so
// they never read out "asterisk asterisk" and get natural pauses between
// list items.
function stripMarkdown(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) =>
      l
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/^\s*[-*•]\s+/, '')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/[*`]/g, '')
        .trim()
    )
    .filter(Boolean)
    .map((l) => (/[.!?।:;]$/.test(l) ? l : l + '.'))
    .join(' ');
}

const SUGGESTION_ICONS = ['🏛️', '🎓', '💼', '📝'];

export default function MentorChat() {
  const { t, lang } = useLanguage();
  const announce = useAnnounce();
  const { speak } = useSpeech();

  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', content }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const dictation = useDictation((transcript) => {
    setInput((prev) => (prev ? prev + ' ' : '') + transcript);
  });

  // Scroll to the latest message whenever the conversation changes.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading, error]);

  // Focus the input and announce when the panel opens; close on Escape.
  useEffect(() => {
    if (open) {
      setEverOpened(true);
      inputRef.current?.focus();
      announce(t('mentor.open'));
    }
    function handleKey(e) {
      if (e.key === 'Escape' && open) setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Single place that asks the server for a reply for a given history, used
  // by both "send" and "retry" so they can't drift apart.
  async function requestReply(history) {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/mentor/chat', { messages: history, lang });
      const reply = res.data.reply;
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      announce(stripMarkdown(reply).slice(0, 200));
    } catch (err) {
      const msg = err.response?.data?.message || t('mentor.errorGeneric');
      setError(msg);
      announce(msg);
      // The user's message stays in the thread; the inline error banner
      // (with a Retry button) covers the failure instead of a fake reply.
    } finally {
      setLoading(false);
    }
  }

  function sendMessage(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    requestReply(nextMessages);
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  function handleRetry() {
    if (loading) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    requestReply(messages);
  }

  function handleClear() {
    setMessages([]);
    setError('');
    announce(t('mentor.clearChat'));
  }

  const suggestions = [
    t('mentor.suggestion1'),
    t('mentor.suggestion2'),
    t('mentor.suggestion3'),
    t('mentor.suggestion4'),
  ];

  return (
    <>
      <button
        type="button"
        className={`mentor-fab${everOpened ? ' mentor-fab-settled' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t('mentor.close') : t('mentor.open')}
      >
        {open ? '✕' : '🧑‍🏫'}
        <span className="mentor-fab-label">{t('mentor.fab')}</span>
      </button>

      {open && (
        <div className="mentor-panel" role="dialog" aria-modal="false" aria-label={t('mentor.title')} ref={panelRef}>
          <div className="mentor-header">
            <span className="mentor-header-avatar" aria-hidden="true">🧑‍🏫</span>
            <div className="mentor-header-text">
              <h2>{t('mentor.title')}</h2>
              <p>{t('mentor.subtitle')}</p>
            </div>
            <button type="button" className="mentor-close" onClick={() => setOpen(false)} aria-label={t('mentor.close')}>✕</button>
          </div>

          <div className="mentor-messages" ref={listRef} aria-live="polite">
            <div className="mentor-row assistant">
              <span className="mentor-avatar" aria-hidden="true">🧑‍🏫</span>
              <div className="mentor-bubble-wrap">
                <div className="mentor-bubble assistant">
                  <p>{t('mentor.greeting')}</p>
                </div>
              </div>
            </div>

            {messages.length === 0 && (
              <div className="mentor-suggestions">
                {suggestions.map((s, i) => (
                  <button key={s} type="button" className="mentor-suggestion" onClick={() => sendMessage(s)}>
                    <span className="mentor-suggestion-icon" aria-hidden="true">{SUGGESTION_ICONS[i % SUGGESTION_ICONS.length]}</span>
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div className={`mentor-row ${m.role}`} key={i}>
                <span className="mentor-avatar" aria-hidden="true">{m.role === 'assistant' ? '🧑‍🏫' : '🙂'}</span>
                <div className="mentor-bubble-wrap">
                  <div className={`mentor-bubble ${m.role}`}>
                    {m.role === 'assistant'
                      ? renderMarkdown(m.content)
                      : <p style={{ whiteSpace: 'pre-wrap' }}>{m.content}</p>}
                  </div>
                  {m.role === 'assistant' && (
                    <button
                      type="button"
                      className="mentor-listen"
                      onClick={() => speak(stripMarkdown(m.content))}
                      aria-label={t('mentor.readAloud')}
                    >
                      <span aria-hidden="true">🔊</span> {t('common.listen')}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="mentor-row assistant">
                <span className="mentor-avatar" aria-hidden="true">🧑‍🏫</span>
                <div className="mentor-bubble-wrap">
                  <div className="mentor-bubble assistant mentor-thinking">
                    <span className="mentor-dots" aria-hidden="true"><i /><i /><i /></span>
                    <span className="mentor-sr">{t('mentor.thinking')}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mentor-error" role="alert">
                <p>{error}</p>
                <button type="button" className="btn btn-sm btn-ghost" onClick={handleRetry}>{t('mentor.retry')}</button>
              </div>
            )}
          </div>

          <form className="mentor-input-row" onSubmit={handleSubmit}>
            {messages.length > 0 && (
              <button type="button" className="mentor-icon-btn" onClick={handleClear} aria-label={t('mentor.clearChat')} title={t('mentor.clearChat')}>
                ↺
              </button>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('mentor.placeholder')}
              aria-label={t('mentor.placeholder')}
              disabled={loading}
            />
            {dictation.supported && (
              <button
                type="button"
                className="mentor-icon-btn"
                aria-pressed={dictation.listening}
                aria-label="Dictate your question"
                onClick={dictation.toggle}
                disabled={loading}
              >
                🎙
              </button>
            )}
            <button
              type="submit"
              className="mentor-icon-btn mentor-send"
              aria-label={t('mentor.send')}
              title={t('mentor.send')}
              disabled={loading || !input.trim()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12L20 4L14 20L11 13L4 12Z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
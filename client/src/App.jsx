import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { EMOJIS } from "./emojis.js";

const USER_LIST = ["Alan", "Bob", "Carol", "Dean", "Elin"];
const SERVER_URL = "http://localhost:4000";

const randomUser = () => USER_LIST[Math.floor(Math.random() * USER_LIST.length)];
const timeNow = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const initials = (name) => name.slice(0, 2).toUpperCase();

// Turn "@Alan" inside message text into a highlighted span
function renderText(text) {
  const parts = text.split(/(@(?:Alan|Bob|Carol|Dean|Elin)\b)/g);
  return parts.map((p, i) =>
    p.startsWith("@") && USER_LIST.includes(p.slice(1)) ? (
      <span key={i} className="mention">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [mentionQuery, setMentionQuery] = useState(null); // null = closed

  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const endRef = useRef(null);

  // ---- socket.io (stretch goal). App still works locally if server is off ----
  useEffect(() => {
    const socket = io(SERVER_URL, { reconnectionAttempts: 3, timeout: 2000 });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat:history", (history) => setMessages(history));
    socket.on("chat:message", (msg) =>
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
    );
    socket.on("chat:likes", ({ id, likes }) =>
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, likes } : m)))
    );

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- send message ----
  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user: randomUser(), // random username per message
      text: trimmed,
      likes: 0,
      time: timeNow(),
    };

    if (connected) socketRef.current.emit("chat:message", msg);
    else setMessages((prev) => [...prev, msg]);

    setText("");
    setShowEmoji(false);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  // ---- like ----
  const likeMessage = (id) => {
    if (connected) socketRef.current.emit("chat:like", id);
    else
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m))
      );
  };

  // ---- input handling + @mention detection ----
  const onChange = (e) => {
    const value = e.target.value;
    setText(value);
    const caret = e.target.selectionStart;
    const match = value.slice(0, caret).match(/@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (name) => {
    const el = inputRef.current;
    const caret = el.selectionStart;
    const before = text.slice(0, caret).replace(/@(\w*)$/, `@${name} `);
    const after = text.slice(caret);
    setText(before + after);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  const mentionOptions = useMemo(() => {
    if (mentionQuery === null) return [];
    return USER_LIST.filter((u) => u.toLowerCase().startsWith(mentionQuery.toLowerCase()));
  }, [mentionQuery]);

  // ---- emoji ----
  const emojiResults = useMemo(() => {
    const q = emojiQuery.trim().toLowerCase();
    return q ? EMOJIS.filter((x) => x.k.includes(q)) : EMOJIS;
  }, [emojiQuery]);

  const addEmoji = (emoji) => {
    setText((t) => t + emoji);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mentionQuery !== null && mentionOptions.length) insertMention(mentionOptions[0]);
      else sendMessage();
    }
    if (e.key === "Escape") {
      setMentionQuery(null);
      setShowEmoji(false);
    }
  };

  return (
    <div className="chat">
      <header className="chat-header">
        <div>
          <h1>Introductions</h1>
          <p>This channel is for company-wide chatter</p>
        </div>
        <span className={`status ${connected ? "on" : "off"}`}>
          {connected ? "Live (socket.io)" : "Local mode"}
        </span>
      </header>

      <main className="thread">
        {messages.length === 0 && (
          <p className="empty">No messages yet. Type below and press Send.</p>
        )}
        {messages.map((m) => (
          <div className="message" key={m.id}>
            <div className="avatar" data-u={m.user}>{initials(m.user)}</div>
            <div className="bubble-wrap">
              <div className="meta">
                <strong>{m.user}</strong>
                <span>{m.time}</span>
              </div>
              <div className="bubble">
                <span className="msg-text">{renderText(m.text)}</span>
                <button
                  className="like"
                  onClick={() => likeMessage(m.id)}
                  aria-label={`Like message from ${m.user}`}
                >
                  👍 <span className="count">{m.likes}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </main>

      <footer className="composer">
        {mentionQuery !== null && mentionOptions.length > 0 && (
          <ul className="popup mention-list">
            {mentionOptions.map((u) => (
              <li key={u}>
                <button onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}>
                  @{u}
                </button>
              </li>
            ))}
          </ul>
        )}

        {showEmoji && (
          <div className="popup emoji-panel">
            <input
              className="emoji-search"
              placeholder="Search emoji (try: wave)"
              value={emojiQuery}
              onChange={(e) => setEmojiQuery(e.target.value)}
              autoFocus
            />
            <div className="emoji-grid">
              {emojiResults.length === 0 && <span className="muted">No results</span>}
              {emojiResults.map((x) => (
                <button key={x.e} onClick={() => addEmoji(x.e)}>{x.e}</button>
              ))}
            </div>
          </div>
        )}

        <button
          className="icon-btn"
          onClick={() => setShowEmoji((s) => !s)}
          aria-label="Toggle emoji picker"
        >
          😊
        </button>
        <input
          ref={inputRef}
          className="text-input"
          type="text"
          placeholder="Type a message. Use @ to mention someone"
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
        <button className="send" onClick={sendMessage} disabled={!text.trim()}>
          Send
        </button>
      </footer>
    </div>
  );
}

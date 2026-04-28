// src/components/patient/AISymptomCheckerChatbot.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeSymptoms } from '../../services/aiSymptomCheckerService';

const ASSISTANT_NAME = 'ELIXRAA — Clinical Assistant';

const formatAiResponse = (payload) => {
  // keep a lightweight formatter for fallbacks; primary rendering will use structured payload
  const analysis = payload?.analysis || {};
  const doctors = Array.isArray(payload?.recommendedDoctors) ? payload.recommendedDoctors : [];
  const disclaimer = payload?.disclaimer || analysis?.disclaimer;

  const parts = [];
  if (analysis.analysis) parts.push(analysis.analysis);
  if (analysis.possibleConditions) parts.push(`Possible conditions: ${analysis.possibleConditions}`);
  if (analysis.urgencyLevel) parts.push(`Urgency level: ${analysis.urgencyLevel}`);
  if (analysis.recommendedSpecialty) parts.push(`Recommended specialty: ${analysis.recommendedSpecialty}`);

  if (doctors.length > 0) {
    parts.push('Recommended doctors:\n' + doctors.map((d) => `• Dr. ${d?.name || 'Unknown'} — ${d?.specialty || 'N/A'}`).join('\n'));
  }

  if (disclaimer) parts.push(`Disclaimer: ${disclaimer}`);

  return parts.join('\n\n');
};

const extractBackendError = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (data?.message) return `HTTP ${status}: ${data.message}`;

  if (data?.errors && typeof data.errors === 'object') {
    const fieldErrors = Object.entries(data.errors)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    return `HTTP ${status}:\n${fieldErrors}`;
  }

  if (typeof data === 'string') return `HTTP ${status}: ${data}`;

  if (status) return `HTTP ${status}: Request failed`;

  return err?.message || 'Request failed';
};

const AISymptomCheckerChatbot = () => {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'bot',
      text: "Hello — I'm CareBot, a clinical assistant. Please describe your symptoms (e.g., 'fever and cough for 3 days'). I will provide a concise clinical analysis, recommended urgency, and suggest an appropriate specialty and available doctors.",
      ts: Date.now()
    }
  ]);

  const listRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError('');
    setLoading(true);
    setInput('');

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: trimmed, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await analyzeSymptoms(trimmed);
      const payload = res.data || {};
      const botMsg = { id: `b-${Date.now()}`, role: 'bot', payload, text: formatAiResponse(payload), ts: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const msg = extractBackendError(err);
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, role: 'bot', text: 'I could not analyze symptoms right now. Please try again later.', ts: Date.now() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    if (!window.confirm('Clear symptom checker chat?')) return;
    setError('');
    setInput('');
    setMessages([
      {
        id: 'welcome',
        role: 'bot',
        text: "Tell me your symptoms (e.g., 'fever + cough for 3 days'). I’ll suggest a specialty and available doctors.",
        ts: Date.now()
      }
    ]);
  };

  return (
    <div className="symptom-chat-card" aria-live="polite">
      <div className="symptom-chat-head">
        <div className="symptom-chat-head-left">
          <div className="assistant-avatar">CB</div>
          <div>
            <div className="assistant-title">ELIXRA — Clinical Assistant</div>
            <div className="assistant-status"><span className="status-dot"/> ACTIVE NOW</div>
          </div>
        </div>
        <div className="symptom-chat-head-actions">
          <button onClick={() => setOpen((v) => !v)} className="hide-btn">{open ? 'Hide' : 'Show'}</button>
          <button onClick={clearChat} disabled={loading} className="clear-btn">Clear</button>
        </div>
      </div>

      {open && (
        <>
          <div
            ref={listRef}
            className="symptom-chat-log"
          >
            {messages.map((m) => (
              <div key={m.id} className={`symptom-chat-row ${m.role === 'user' ? 'symptom-chat-row-user' : 'symptom-chat-row-bot'}`}>
                <div className="symptom-chat-avatar" aria-hidden="true">{m.role === 'user' ? 'You' : 'CB'}</div>
                <div>
                  <div className={`symptom-chat-bubble ${m.role === 'user' ? 'symptom-chat-bubble-user' : 'symptom-chat-bubble-bot'}`}>
                  {m.role === 'bot' && m.payload ? (
                    <div className="ai-response">
                      <div className="ai-response-header"><strong>{ASSISTANT_NAME}</strong></div>
                      {m.payload.analysis?.analysis && (
                        <div className="ai-section">
                          <div className="ai-section-title">Clinical summary</div>
                          <div className="ai-section-body">{m.payload.analysis.analysis}</div>
                        </div>
                      )}

                      {m.payload.analysis?.possibleConditions && (
                        <div className="ai-section">
                          <div className="ai-section-title">Possible conditions</div>
                          <div className="ai-section-body">{m.payload.analysis.possibleConditions}</div>
                        </div>
                      )}

                      {m.payload.analysis?.urgencyLevel && (
                        <div className="ai-section">
                          <div className="ai-section-title">Urgency</div>
                          <div className="ai-section-body">{m.payload.analysis.urgencyLevel}</div>
                        </div>
                      )}

                      {m.payload.analysis?.recommendedSpecialty && (
                        <div className="ai-section">
                          <div className="ai-section-title">Recommended specialty</div>
                          <div className="ai-section-body">{m.payload.analysis.recommendedSpecialty}</div>
                        </div>
                      )}

                      {Array.isArray(m.payload.recommendedDoctors) && m.payload.recommendedDoctors.length > 0 && (
                        <div className="ai-section">
                          <div className="ai-section-title">Recommended doctors</div>
                          <ul className="ai-doctor-list">
                            {m.payload.recommendedDoctors.map((d) => (
                              <li key={d.id || d.name} className="ai-doctor-item">
                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem'}}>
                                  <div>
                                    <strong>Dr. {d.name}</strong>
                                    <div className="ai-doctor-meta">{d.specialty} — ID: {d.id ?? 'N/A'}</div>
                                  </div>
                                  <div style={{display: 'flex', gap: '0.4rem', alignItems: 'center'}}>
                                    <button className="ai-action-btn" onClick={() => {
                                      // Quick action: navigate to doctors showcase with prefill params
                                      const params = new URLSearchParams();
                                      if (d.id) params.set('prefillDoctorId', d.id);
                                      if (d.specialty) params.set('prefillSpecialty', d.specialty);
                                      if (d.name) params.set('prefillDoctorName', d.name);
                                      window.location.href = `/doctors?${params.toString()}`;
                                    }}>Book</button>
                                    <button className="ai-action-btn ai-action-secondary" onClick={() => {
                                      // quick info: copy doctor id or open a mailto placeholder
                                      window.navigator.clipboard?.writeText(d.id ? String(d.id) : d.name || '');
                                      alert('Doctor ID copied to clipboard');
                                    }}>Copy ID</button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {m.payload.disclaimer && (
                        <div className="ai-section ai-disclaimer">
                          <small>{m.payload.disclaimer}</small>
                        </div>
                      )}
                      {/* Quick-action chips (either provided by payload or defaults) */}
                      <div className="ai-action-chips">
                        {(Array.isArray(m.payload?.actions) ? m.payload.actions : ['Schedule','Briefs']).map((a) => (
                          <button key={a} className="ai-chip" onClick={() => console.log('AI action', a)}>{a}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // plain text fallback
                    m.text
                  )}
                  </div>
                  <div className="symptom-chat-meta"><small>{new Date(m.ts).toLocaleString()}</small></div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="symptom-chat-row symptom-chat-row-bot">
                <div className="symptom-chat-bubble symptom-chat-bubble-bot">
                  <em>{ASSISTANT_NAME} is typing…</em>
                </div>
              </div>
            )}
          </div>

          <div className="symptom-chat-input-row">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type symptoms and press Enter to send (Shift+Enter for newline)"
              className="symptom-chat-input"
              disabled={loading}
            />
            <button onClick={send} disabled={!canSend} className="symptom-chat-send-btn">
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>

          {error && (
            <div className="symptom-chat-error">
              {error}
            </div>
          )}
        </>
      )}

      {!open && (
        <div className="symptom-chat-toggle-button" onClick={() => setOpen(true)} title="Open Symptom Checker">
          <div className="toggle-avatar">CB</div>
          <div style={{fontWeight:700}}>Symptom Checker</div>
        </div>
      )}
    </div>
  );
};

export default AISymptomCheckerChatbot;

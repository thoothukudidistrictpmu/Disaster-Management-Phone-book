import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Trash2,
  Sparkles,
  Bot,
  User,
  Zap,
  Cpu,
  Loader2,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Square,
  Radio,
  Phone,
  MessageCircle,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export type ModelType = 'general' | 'fast' | 'complex';

const MODEL_INFO: Record<ModelType, { label: string; modelName: string; badge: string; icon: React.ReactNode }> = {
  fast: {
    label: 'Fast',
    modelName: 'gemini-3.1-flash-lite',
    badge: 'Lite (Ultra Fast)',
    icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
  },
  general: {
    label: 'General',
    modelName: 'gemini-3.5-flash',
    badge: 'Flash (Balanced)',
    icon: <Sparkles className="w-3.5 h-3.5 text-sky-500" />,
  },
  complex: {
    label: 'Complex',
    modelName: 'gemini-3.1-pro-preview',
    badge: 'Pro (Deep Reasoning)',
    icon: <Cpu className="w-3.5 h-3.5 text-indigo-500" />,
  },
};

const SUGGESTED_QUESTIONS = [
  'Tahsildar number in Kovilpatti',
  'Tiruchendur Tahsildar contact',
  'ADE Highways Thoothukudi',
  'Fire & Rescue Srivaikundam',
];

export const ChatInterface: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [modelType, setModelType] = useState<ModelType>('fast');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Optional Voice Output (Text-to-Speech) for reading answers aloud
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Welcome to the **Disaster Management AI Directory Assistant**.\n\nAsk for any emergency response officer by Taluk and Designation (e.g., *"What is the Tahsildar number in Kovilpatti?"* or *"Fire & Rescue Station Officer in Tiruchendur"*). I will provide verified officer contact numbers with direct call and WhatsApp links.\n\nHow can I help you find emergency contacts today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.1-flash-lite',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      stopSpeaking();
    }
  }, [isOpen, messages, isLoading]);

  // Clean text for speech synthesis (strip markdown, links, symbols)
  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#+\s/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/tel:\S+/g, '')
      .replace(/[•-]\s/g, ', ')
      .replace(/\n+/g, '. ')
      .trim();
  };

  // Speak text aloud using browser SpeechSynthesis
  const speakText = (text: string, messageId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const spokenText = cleanTextForSpeech(text);
    if (!spokenText) return;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang === 'en-IN' || v.name.toLowerCase().includes('india')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentSpeakingId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentSpeakingId(null);
  };

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isLoading) return;

    stopSpeaking();

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const payload = {
        messages: updatedHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        modelPreference: modelType,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to generate response');
      }

      const botMessageId = `bot-${Date.now()}`;
      const botMessage: ChatMessage = {
        id: botMessageId,
        role: 'model',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (autoSpeak) {
        setTimeout(() => {
          speakText(data.reply, botMessageId);
        }, 300);
      }
    } catch (err: any) {
      console.warn('Chat request notice:', err);
      const errorMessageId = `err-${Date.now()}`;
      const errorMessage: ChatMessage = {
        id: errorMessageId,
        role: 'model',
        content:
          'Unable to reach the assistant right now. You can instantly find any officer using the Taluk and Department search filters directly above.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    stopSpeaking();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        content:
          'Conversation history cleared. How can I help you find officer contact numbers or disaster response services?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: MODEL_INFO[modelType].modelName,
      },
    ]);
  };

  // Helper to format basic markdown with interactive Call / WhatsApp action chips
  const renderFormattedMessage = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const bulletText = line.substring(2);
        return (
          <li key={idx} className="ml-3 sm:ml-4 list-disc text-slate-800 my-0.5 leading-relaxed">
            {formatInlineText(bulletText)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+\.)\s(.*)/);
        return (
          <div key={idx} className="flex gap-2 text-slate-800 my-1 leading-relaxed">
            <span className="font-semibold text-sky-700 shrink-0">{match?.[1]}</span>
            <span>{formatInlineText(match?.[2] || line)}</span>
          </div>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="my-1 leading-relaxed">
          {formatInlineText(line)}
        </p>
      );
    });
  };

  const formatInlineText = (text: string) => {
    const linkRegex = /\[(.*?)\]\((https?:\/\/.*?|tel:.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const isCall = match[2].startsWith('tel:');
      const isWa = match[2].includes('wa.me');
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target={isCall ? undefined : '_blank'}
          rel={isCall ? undefined : 'noopener noreferrer'}
          className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg text-xs my-0.5 mx-0.5 shadow-2xs transition-transform active:scale-95 ${
            isCall
              ? 'bg-blue-700 text-white hover:bg-blue-800'
              : isWa
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'text-sky-700 underline'
          }`}
        >
          {isCall ? <Phone className="w-3 h-3 fill-current" /> : isWa ? <MessageCircle className="w-3 h-3 fill-current" /> : null}
          <span>{match[1]}</span>
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.map((part, pIdx) => {
      if (typeof part === 'string') {
        const boldParts = part.split(/(\*\*.*?\*\*)/g);
        return boldParts.map((bPart, bIdx) => {
          if (bPart.startsWith('**') && bPart.endsWith('**')) {
            return (
              <strong key={`${pIdx}-${bIdx}`} className="font-bold text-slate-900">
                {bPart.slice(2, -2)}
              </strong>
            );
          }
          return bPart;
        });
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Toggle Launcher Button - Responsive on Mobile & Tablet */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 sm:gap-2.5 px-3.5 py-2.5 sm:px-5 sm:py-3.5 bg-gradient-to-r from-blue-700 via-sky-600 to-blue-800 hover:from-blue-800 hover:via-sky-700 hover:to-blue-900 text-white rounded-full shadow-lg shadow-sky-900/25 hover:shadow-xl transition-all duration-200 cursor-pointer active:scale-95 group border border-sky-300/40"
            aria-label="Open Disaster Response AI Assistant"
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-sky-100 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white animate-pulse" />
            </div>
            <div className="text-left">
              <span className="block text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-sky-100 leading-none">
                Disaster Response
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white leading-tight">
                AI Directory Assistant
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-45 sm:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Responsive Chat Interface Modal / Drawer */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 ease-out flex flex-col bg-white overflow-hidden shadow-2xl border border-sky-200 ${
            isExpanded
              ? 'inset-2 sm:inset-6 md:inset-8 lg:inset-10 max-w-5xl mx-auto rounded-xl sm:rounded-2xl'
              : 'inset-0 sm:inset-auto sm:bottom-5 sm:right-5 md:bottom-6 md:right-6 w-full sm:w-[470px] md:w-[500px] lg:w-[520px] h-full sm:h-[620px] md:h-[660px] sm:max-h-[88vh] rounded-none sm:rounded-2xl'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-heading"
        >
          {/* Header - Compact on Mobile, Spacious on Tablet/Desktop */}
          <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-sky-900 text-white px-3 py-2.5 sm:px-4 sm:py-3.5 flex items-center justify-between border-b border-sky-700/40 shrink-0">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-md ring-1 ring-sky-300/40 shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 id="chat-heading" className="text-xs sm:text-sm md:text-base font-bold text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">Disaster Response AI Assistant</span>
                  <span className="shrink-0 text-[9px] sm:text-[10px] bg-sky-500/30 text-sky-200 font-semibold px-1.5 py-0.5 rounded-sm border border-sky-400/30">
                    Gemini
                  </span>
                </h2>
                <p className="text-[10px] sm:text-[11px] text-sky-200 truncate">
                  Disaster Management Phone Directory
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 text-sky-200 shrink-0 ml-2">
              {/* Voice auto-speak toggle */}
              <button
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setAutoSpeak(!autoSpeak);
                }}
                title={autoSpeak ? 'Audio speech output: Active (Click to mute)' : 'Audio speech output: Muted (Click to enable)'}
                className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                  autoSpeak ? 'bg-sky-500/30 text-sky-100 ring-1 ring-sky-400/40' : 'hover:bg-white/10 text-sky-300'
                }`}
              >
                {autoSpeak ? <Volume2 className="w-3.5 h-3.5 text-emerald-300" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="text-[10px] hidden md:inline">{autoSpeak ? 'Audio On' : 'Audio Off'}</span>
              </button>

              <button
                onClick={handleClearHistory}
                title="Clear conversation"
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs flex items-center cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Expand button (Tablet & Desktop only) */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restore size' : 'Expand panel'}
                className="hidden sm:inline-flex p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-0.5 cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Controls Strip (Model Selection Only) */}
          <div className="bg-sky-50/90 border-b border-sky-100 px-3 py-1.5 sm:py-2 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                AI Model:
              </span>
              <span className="text-[10px] font-mono text-sky-700 bg-sky-100/70 px-1.5 py-0.5 rounded truncate">
                {MODEL_INFO[modelType].modelName}
              </span>
            </div>

            {/* Model Speed/Task Selector */}
            <div className="flex items-center gap-1 shrink-0">
              {(['fast', 'general', 'complex'] as ModelType[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setModelType(m)}
                  title={`${MODEL_INFO[m].label}: ${MODEL_INFO[m].modelName}`}
                  className={`px-2 py-1 rounded-md text-[10.5px] sm:text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                    modelType === m
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {MODEL_INFO[m].icon}
                  <span>{MODEL_INFO[m].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Speaking Indicator Bar */}
          {isSpeaking && (
            <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-800 animate-fade-in shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                <span className="font-semibold text-[11px] truncate">Reading response aloud...</span>
              </div>
              <button
                onClick={stopSpeaking}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" /> Stop
              </button>
            </div>
          )}

          {/* Scrollable Conversation Thread */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const isCurrentBotSpeaking = currentSpeakingId === message.id;

              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-2 sm:gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 text-xs shadow-2xs ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-sky-800 border border-sky-200 shadow-xs'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-700" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm shadow-2xs leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div className="space-y-1 text-slate-800 text-[13px] sm:text-[13.5px]">
                        {renderFormattedMessage(message.content)}
                      </div>
                    )}

                    {/* Metadata & Actions Footer */}
                    <div
                      className={`flex items-center gap-2 mt-2 pt-1 border-t ${
                        isUser
                          ? 'border-blue-500/40 text-blue-200 justify-end'
                          : 'border-slate-100 text-slate-400 justify-between'
                      } text-[10px]`}
                    >
                      {!isUser && (
                        <div className="flex items-center gap-2">
                          {/* Listen Aloud Button */}
                          <button
                            onClick={() => {
                              if (isCurrentBotSpeaking) {
                                stopSpeaking();
                              } else {
                                speakText(message.content, message.id);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                              isCurrentBotSpeaking
                                ? 'bg-emerald-100 text-emerald-800 font-bold'
                                : 'text-slate-500 hover:text-sky-700 hover:bg-slate-100'
                            }`}
                            title={isCurrentBotSpeaking ? 'Stop audio' : 'Listen aloud'}
                          >
                            {isCurrentBotSpeaking ? (
                              <>
                                <Square className="w-3 h-3 fill-current text-emerald-600" />
                                <span>Speaking...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-sky-600" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          {message.modelUsed && (
                            <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1 rounded hidden sm:inline">
                              {message.modelUsed}
                            </span>
                          )}
                        </div>
                      )}
                      <span>{message.timestamp}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Generating / Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-2 sm:gap-2.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-sky-200 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-700" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                    <span>Searching official directory and preparing response...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestions */}
          {messages.length <= 3 && !isLoading && (
            <div className="px-3 py-1.5 sm:py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                Quick:
              </span>
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="text-left text-[10.5px] sm:text-[11px] font-medium text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Clean Input Form - Type and Send */}
          <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200 shrink-0 pb-safe">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Ask: "Tahsildar number in Kovilpatti"...'
                disabled={isLoading}
                className="flex-1 border border-slate-200 bg-slate-50 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-900 text-base sm:text-sm rounded-xl px-3.5 py-2 sm:py-2.5 outline-none transition-all disabled:opacity-50"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:via-sky-700 hover:to-blue-900 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-700/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                aria-label="Send Message"
              >
                <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </form>

            <div className="mt-1 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 px-1">
              <span>Instant disaster directory lookup</span>
              <span>134 Officials Grounded</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

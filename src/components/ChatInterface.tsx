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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Radio,
  Phone,
  MessageCircle,
  Check,
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

  // Voice Input (Dual-engine: Live SpeechRecognition + MediaRecorder Fallback)
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [voiceStatusText, setVoiceStatusText] = useState('Listening... Speak now');

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const speechTranscriptRef = useRef<string>('');

  // Voice Output (Text-to-Speech) State
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Welcome to the **Disaster Management AI Directory Assistant**.\n\nAsk for any emergency response officer by Taluk and Designation (e.g., *"What is the Tahsildar number in Kovilpatti?"* or *"Fire & Rescue Station Officer in Tiruchendur"*). You can **speak your question by tapping the microphone 🎙️**, and I will provide verified officer contact details and speak the response aloud 🔊.\n\nHow can I help with emergency contacts today?',
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
      stopVoiceInput(false);
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

  // Start Voice Input (Dual Engine: getUserMedia + MediaRecorder + SpeechRecognition)
  const startVoiceInput = async () => {
    stopSpeaking();
    setVoiceNotice(null);
    speechTranscriptRef.current = '';
    setVoiceStatusText('Listening... Speak now');

    // 1. Request microphone permission explicitly via getUserMedia
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Start recording audio in chunks via MediaRecorder for 100% reliable fallback
      audioChunksRef.current = [];
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
        }
        try {
          const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          mediaRecorderRef.current = recorder;
          recorder.start(100);
        } catch (recErr) {
          console.warn('MediaRecorder init error:', recErr);
        }
      }

      setIsListening(true);

      // 3. Simultaneously launch Web SpeechRecognition for instantaneous live text if supported
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const recognition = new SpeechRec();
          recognition.lang = 'en-IN';
          recognition.interimResults = true;
          recognition.continuous = false;

          recognition.onresult = (e: any) => {
            const transcript = Array.from(e.results)
              .map((r: any) => r[0].transcript)
              .join('');
            if (transcript) {
              setInput(transcript);
              speechTranscriptRef.current = transcript;
              setVoiceStatusText(`Heard: "${transcript}"`);
            }
          };

          recognition.onerror = (e: any) => {
            console.warn('SpeechRecognition interim notice:', e.error);
          };

          recognition.onend = () => {
            // Auto submit when speaker pauses if transcript was gathered
            if (speechTranscriptRef.current.trim().length > 3) {
              setTimeout(() => {
                stopVoiceInput(true);
              }, 400);
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch (e) {
          console.warn('SpeechRec start warning:', e);
        }
      }
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setIsListening(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceNotice('Microphone access was blocked. Please click the camera/mic icon in your browser address bar to allow microphone access.');
      } else {
        setVoiceNotice('Microphone error: ' + (err.message || 'Check audio input settings.'));
      }
      setTimeout(() => setVoiceNotice(null), 6000);
    }
  };

  // Stop Voice Input & Search
  const stopVoiceInput = async (shouldSubmit = true) => {
    setIsListening(false);

    // Stop SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    // Stop microphone hardware tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (!shouldSubmit) {
      setVoiceNotice(null);
      return;
    }

    // Determine query: preferred live text from SpeechRecognition, else input
    const recognizedText = speechTranscriptRef.current.trim() || input.trim();

    if (recognizedText) {
      // Immediate search with transcribed text!
      setVoiceNotice(null);
      handleSend(recognizedText, true);
      return;
    }

    // If no text was recognized by browser speech API (e.g. in iframe network block),
    // send raw recorded audio to Gemini /api/voice-chat!
    const chunks = [...audioChunksRef.current];
    if (chunks.length > 0) {
      setIsLoading(true);
      setVoiceNotice('Processing voice query with AI audio model...');

      try {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          try {
            const res = await fetch('/api/voice-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioData: base64Data,
                mimeType: 'audio/webm',
              }),
            });
            const data = await res.json();
            if (data.success) {
              const userMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: data.userTranscript || 'Voice Search Inquiry',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              const botMessageId = `bot-${Date.now()}`;
              const botMessage: ChatMessage = {
                id: botMessageId,
                role: 'model',
                content: data.reply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                modelUsed: data.modelUsed,
              };
              setMessages((prev) => [...prev, userMessage, botMessage]);
              if (autoSpeak) {
                setTimeout(() => speakText(data.reply, botMessageId), 300);
              }
            } else {
              throw new Error(data.message || 'Voice inquiry failed');
            }
          } catch (err) {
            console.error('Audio processing failed:', err);
            setVoiceNotice('Could not hear clearly. Please try speaking again or type your question.');
            setTimeout(() => setVoiceNotice(null), 5000);
          } finally {
            setIsLoading(false);
            setVoiceNotice(null);
          }
        };
      } catch (err) {
        setIsLoading(false);
        setVoiceNotice(null);
      }
    } else {
      setVoiceNotice('No speech detected. Please speak closer to your microphone.');
      setTimeout(() => setVoiceNotice(null), 4000);
    }
  };

  const handleSend = async (textToSend?: string, fromVoice = false) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isLoading) return;

    if (isListening) {
      stopVoiceInput(false);
    }
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

      if (autoSpeak || fromVoice) {
        setTimeout(() => {
          speakText(data.reply, botMessageId);
        }, 300);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessageId = `err-${Date.now()}`;
      const errorMessage: ChatMessage = {
        id: errorMessageId,
        role: 'model',
        content:
          'Sorry, the assistant is currently experiencing high load. Please try again or use the directory search dropdowns directly above to contact officers.',
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
                AI Voice & Text Assistant
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
                title={autoSpeak ? 'Voice output: Active (Click to mute)' : 'Voice output: Muted (Click to enable)'}
                className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                  autoSpeak ? 'bg-sky-500/30 text-sky-100 ring-1 ring-sky-400/40' : 'hover:bg-white/10 text-sky-300'
                }`}
              >
                {autoSpeak ? <Volume2 className="w-3.5 h-3.5 text-emerald-300" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="text-[10px] hidden md:inline">{autoSpeak ? 'Voice On' : 'Muted'}</span>
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
                <span className="font-semibold text-[11px] truncate">Speaking response aloud...</span>
              </div>
              <button
                onClick={stopSpeaking}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" /> Stop
              </button>
            </div>
          )}

          {/* Voice Notice / Error Bar */}
          {voiceNotice && (
            <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Mic className="w-3.5 h-3.5 text-amber-700 animate-pulse shrink-0" />
                <span className="text-[11px] font-medium truncate">{voiceNotice}</span>
              </div>
              <button
                onClick={() => setVoiceNotice(null)}
                className="text-[10px] text-amber-700 hover:text-amber-900 px-1 font-bold ml-2 cursor-pointer"
              >
                Dismiss
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
                            title={isCurrentBotSpeaking ? 'Stop speaking' : 'Listen aloud'}
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
          {messages.length <= 3 && !isLoading && !isListening && (
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

          {/* ACTIVE RECORDING HUD OVERLAY (When user taps mic) */}
          {isListening && (
            <div className="p-3 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-t border-rose-200 flex flex-col gap-2 shrink-0 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                  </span>
                  <span className="font-bold text-xs text-rose-900 truncate">
                    {voiceStatusText}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => stopVoiceInput(true)}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Search Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => stopVoiceInput(false)}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-rose-700/90 italic truncate">
                {input ? `Recognized: "${input}"` : 'Tip: Say officer title and taluk, e.g. "Tahsildar in Kovilpatti"'}
              </p>
            </div>
          )}

          {/* Standard Input Form with Voice Mic & Send */}
          {!isListening && (
            <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200 shrink-0 pb-safe">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                {/* Voice Recognition (Mic) Button */}
                <button
                  type="button"
                  onClick={startVoiceInput}
                  disabled={isLoading}
                  title="Speak your question (Voice Search)"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs active:scale-95 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 hover:border-sky-300"
                  aria-label="Start voice search"
                >
                  <Mic className="w-5 h-5 text-sky-700" />
                </button>

                {/* Text Input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='Tap 🎙️ or type: "Tahsildar in Kovilpatti"...'
                  disabled={isLoading}
                  className="flex-1 border border-slate-200 bg-slate-50 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-900 text-base sm:text-sm rounded-xl px-3 sm:px-3.5 py-2 sm:py-2.5 outline-none transition-all disabled:opacity-50"
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
                <span>🎙️ Tap mic to speak • 🔊 Spoken answers</span>
                <span>134 Officials Grounded</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Cross, Send } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import LiveDiagnosticScanner from './components/LiveDiagnosticScanner';

function generateThreadId() {
  return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [visionTask, setVisionTask] = useState({ active: false, type: null });
  const [threadId] = useState(() => generateThreadId());
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, visionTask]);

  const sendMessage = async (userMessage, diagnosticData = null) => {
    if (!userMessage.trim() && !diagnosticData) return;

    const newUserMessage = userMessage.trim();
    if (newUserMessage) {
      setMessages(prev => [...prev, { role: 'user', content: newUserMessage }]);
    }

    setIsProcessing(true);
    setInputValue('');

    try {
      const payload = {
        user_id: 'patient_001',
        thread_id: threadId,
        message: newUserMessage || 'Diagnostic data submitted',
      };

      if (diagnosticData) {
        payload.functional_test_results = diagnosticData;
        payload.functional_test_type = visionTask.type;
      }

      const response = await axios.post('http://localhost:8000/chat', payload);

      const aiMessage = typeof response.data === 'string'
        ? response.data
        : response.data.message || 'Response received';

      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);

      if (response.data.video_stream_active === true) {
        setVisionTask({
          active: true,
          type: response.data.functional_test_type || 'Vision Assessment'
        });
      } else {
        setVisionTask({ active: false, type: null });
      }

    } catch (error) {
      console.error('Error sending message:', error);

      let errorMessage = 'Unable to connect to the diagnostic server. Please ensure the backend is running on http://localhost:8000';

      if (error.response) {
        errorMessage = `Server error: ${error.response.status}. ${error.response.data?.detail || 'Please try again.'}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check if the backend is running.';
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isProcessing && !visionTask.active) {
      sendMessage(inputValue);
    }
  };

  const handleDiagnosticComplete = (diagnosticData) => {
    setVisionTask({ active: false, type: null });
    sendMessage('', diagnosticData);
  };

  const handleDiagnosticCancel = () => {
    setVisionTask({ active: false, type: null });
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Diagnostic scan cancelled. How else can I assist you?'
    }]);
  };

  const isInputDisabled = isProcessing || visionTask.active;
  const inputPlaceholder = visionTask.active
    ? 'Diagnostic in progress...'
    : 'Describe your symptoms or ask a question...';

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Cross className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Agentic EyeCare Copilot</h1>
            <p className="text-sm text-slate-600">AI-Powered Vision Care Assistant</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cross className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Welcome to Agentic EyeCare
              </h2>
              <p className="text-slate-600 max-w-md mx-auto">
                Describe your vision concerns or symptoms, and I'll guide you through an assessment.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <ChatMessage key={index} role={message.role} content={message.content} />
          ))}

          {visionTask.active && (
            <LiveDiagnosticScanner
              visionTaskType={visionTask.type}
              onComplete={handleDiagnosticComplete}
              onCancel={handleDiagnosticCancel}
            />
          )}

          {isProcessing && !visionTask.active && (
            <div className="flex justify-start mb-4">
              <div className="flex gap-3 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
                <div className="px-4 py-3 rounded-lg bg-white border border-slate-200">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={isInputDisabled}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed text-sm"
            />
            <button
              type="submit"
              disabled={isInputDisabled || !inputValue.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-3 text-center">
            For medical emergencies, call emergency services immediately.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

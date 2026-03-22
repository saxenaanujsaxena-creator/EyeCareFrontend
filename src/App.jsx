import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Cross, Send, Camera, Loader2 } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import LiveDiagnosticScanner from './components/LiveDiagnosticScanner';

function generateThreadId() {
  return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false); 
  const [visionTask, setVisionTask] = useState({ active: false, type: null, callId: null });
  const [threadId] = useState(() => generateThreadId());
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, visionTask]);

  const sendMessage = async (userMessage, diagnosticData = null, imageId = null) => {
    if (!userMessage?.trim() && !diagnosticData && !imageId) return;

    const newUserMessage = userMessage?.trim();
    if (newUserMessage) {
      setMessages(prev => [...prev, { role: 'user', content: newUserMessage }]);
    } else if (imageId) {
      setMessages(prev => [...prev, { role: 'user', content: '[Image Uploaded for Structural Scan]' }]);
    }

    setIsProcessing(true);
    setInputValue('');

    try {
      const payload = {
        user_id: 'patient_001', 
        thread_id: threadId,
        message: newUserMessage || null,
        image_id: imageId || null 
      };

      if (diagnosticData) {
        payload.functional_test_results = diagnosticData;
        payload.functional_test_type = visionTask.type;
        if (!payload.message) payload.message = "Diagnostic data submitted";
      }

      // 🚨 FIX: Changed 0.0.0.0 to 127.0.0.1
      const response = await axios.post('http://127.0.0.1:7860/chat', payload);
      
      const aiMessage = typeof response.data === 'string' ? response.data : response.data.response || 'Response received'; 
      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);

      // 🚨 FIX: Safely combined the scanner trigger logic to update the object correctly!
      if (response.data.action === "trigger_scanner" || response.data.video_stream_active === true) {
        const taskType = response.data.task_type || response.data.functional_test_type || 'plr_test';
        console.log("🔥 Backend triggered a scan! Task:", taskType);
        
        setVisionTask({
          active: true,
          type: taskType,
          callId: response.data.call_id || threadId // Fallback to threadId if backend misses it
        });
      } else {
        setVisionTask({ active: false, type: null, callId: null });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please ensure the backend is running.'
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // 🚨 FIX: Changed 0.0.0.0 to 127.0.0.1
      const uploadRes = await axios.post('http://127.0.0.1:7860/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageId = uploadRes.data.image_id;
      await sendMessage(null, null, imageId);
    } catch (error) {
      console.error("Upload failed", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Image upload failed.' }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDiagnosticComplete = (diagnosticData) => {
    setVisionTask({ active: false, type: null, callId: null });
    sendMessage('', diagnosticData);
  };

  const handleDiagnosticCancel = () => {
    setVisionTask({ active: false, type: null, callId: null });
    setMessages(prev => [...prev, { role: 'assistant', content: 'Diagnostic scan cancelled.' }]);
  };

  const isInputDisabled = isProcessing || visionTask.active || isUploading;

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
               <h2 className="text-xl font-semibold text-slate-900 mb-2">Welcome to Agentic EyeCare</h2>
               <p className="text-slate-600 max-w-md mx-auto">Describe symptoms or upload a photo of your eye.</p>
             </div>
          )}
          {messages.map((message, index) => (
            <ChatMessage key={index} role={message.role} content={message.content} />
          ))}
          
          {visionTask.active && (
            <div className="mt-4">
              <LiveDiagnosticScanner
                visionTaskType={visionTask.type}
                callId={visionTask.callId}
                patientId="patient_001" 
                onComplete={handleDiagnosticComplete}
                onCancel={handleDiagnosticCancel}
              />
            </div>
          )}

          {(isProcessing || isUploading) && !visionTask.active && (
            <div className="flex justify-start mb-4 mt-4">
              <div className="px-4 py-3 rounded-lg bg-white border border-slate-200 text-sm text-slate-500 italic">
                {isUploading ? 'Uploading image...' : 'Processing clinical request...'}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isInputDisabled}
              className="p-3 text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={visionTask.active ? 'Diagnostic test active. Please follow agent instructions...' : 'Describe symptoms...'}
              disabled={isInputDisabled}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={isInputDisabled || !inputValue.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}

export default App;
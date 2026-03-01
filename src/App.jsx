import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Cross, Send, Camera, Loader2 } from 'lucide-react'; // Added Camera & Loader2
import ChatMessage from './components/ChatMessage';
import LiveDiagnosticScanner from './components/LiveDiagnosticScanner';

function generateThreadId() {
  return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // New state for image upload
  const [visionTask, setVisionTask] = useState({ active: false, type: null });
  const [threadId] = useState(() => generateThreadId());
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null); // Reference for hidden file input

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, visionTask]);

  // Updated to accept imageId
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
        image_id: imageId || null // Send the image ID to LangGraph
      };

      if (diagnosticData) {
        payload.functional_test_results = diagnosticData;
        payload.functional_test_type = visionTask.type;
        if (!payload.message) payload.message = "Diagnostic data submitted";
      }

      const response = await axios.post('https://monotonousharshh-harsh-devs.hf.space/chat', payload);
      const aiMessage = typeof response.data === 'string' ? response.data : response.data.response || 'Response received'; 

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

  // --- NEW IMAGE UPLOAD HANDLER ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Upload the physical image to your FastAPI backend
      const uploadRes = await axios.post('https://monotonousharshh-harsh-devs.hf.space/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const imageId = uploadRes.data.image_id;
      
      // 2. Send the LangGraph Chat Request with the imageId so it triggers PyTorch
      await sendMessage(null, null, imageId);

    } catch (error) {
      console.error("Upload failed", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Image upload failed. Please try again.' }]);
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const isInputDisabled = isProcessing || visionTask.active || isUploading;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4 shadow-sm">
        {/* ... (Header remains unchanged) ... */}
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
               {/* ... (Welcome UI remains unchanged) ... */}
               <h2 className="text-xl font-semibold text-slate-900 mb-2">Welcome to Agentic EyeCare</h2>
               <p className="text-slate-600 max-w-md mx-auto">Describe your vision concerns, or upload a photo of your eye for analysis.</p>
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

          {(isProcessing || isUploading) && !visionTask.active && (
            <div className="flex justify-start mb-4">
              {/* ... (Loading dots remain unchanged) ... */}
              <div className="px-4 py-3 rounded-lg bg-white border border-slate-200 text-sm text-slate-500">
                {isUploading ? 'Uploading image securely...' : 'Analyzing clinical data...'}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            
            {/* HIDDEN FILE INPUT */}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
            />
            
            {/* ATTACHMENT CAMERA BUTTON */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isInputDisabled}
              className="p-3 text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 focus:outline-none transition-colors disabled:opacity-50"
              title="Upload Eye Image"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={visionTask.active ? 'Diagnostic in progress...' : 'Describe symptoms or upload a photo...'}
              disabled={isInputDisabled}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 text-sm"
            />
            
            <button
              type="submit"
              disabled={isInputDisabled || !inputValue.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none disabled:bg-slate-300 transition-colors flex items-center gap-2 font-medium"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}

export default App;
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Activity, Mic } from 'lucide-react'; 
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  StreamTheme,
  SpeakerLayout,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { MicTester } from './MicTester';

// --- HYBRID PRODUCTION FLASH (DOM INJECTION + HTTP STREAMING) ---
const AutonomousFlashTest = ({ callId }) => {
  useEffect(() => {
    console.log("⏱️ Scanner Mounted! Starting 3-second countdown to flash...");
    
    const flashDiv = document.createElement('div');
    flashDiv.style.position = 'fixed';
    flashDiv.style.top = '0';
    flashDiv.style.left = '0';
    flashDiv.style.width = '100vw';
    flashDiv.style.height = '100vh';
    flashDiv.style.zIndex = '999999'; 
    flashDiv.style.pointerEvents = 'none'; 
    flashDiv.style.backgroundColor = '#111111'; 
    flashDiv.style.transition = 'background-color 0.5s ease';
    document.body.appendChild(flashDiv);

    // 🚀 FIX: Changed to localhost and added explicit error logging
    const captureInterval = setInterval(() => {
        const videoEl = document.querySelector('video');
        if (videoEl && videoEl.videoWidth > 0) {
            console.log("📸 Video element found! Snapping frame...");
            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            
            const base64 = canvas.toDataURL('image/jpeg', 0.4); 
            
            // Send to localhost!
            axios.post(`http://127.0.0.1:7860/analyze-vision/${callId}`, { image: base64 })
                 .catch((err) => {
                     // If it fails, we will finally see WHY in the browser console!
                     console.error("❌ Network Error sending frame:", err.message);
                 }); 
        }
    }, 200); 

    // The White Flash!
    const flashTimer = setTimeout(() => {
      console.log("💡 FLASHING SCREEN NOW!");
      flashDiv.style.transition = 'none';
      flashDiv.style.backgroundColor = '#FFFFFF'; 
    }, 3000);

    // End Test
    const endTimer = setTimeout(() => {
      clearInterval(captureInterval);
      if (document.body.contains(flashDiv)) document.body.removeChild(flashDiv);
    }, 6000);

    return () => { 
        clearInterval(captureInterval);
        clearTimeout(flashTimer); 
        clearTimeout(endTimer); 
        if (document.body.contains(flashDiv)) document.body.removeChild(flashDiv);
    };
  }, [callId]);

  return null; 
};


// --- 2. MAIN COMPONENT ---
export default function LiveDiagnosticScanner({ 
  visionTaskType, 
  callId, 
  onComplete, 
  onCancel,
  patientId
}) {
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [setupState, setSetupState] = useState('Initializing secure connection...');
  const [error, setError] = useState(null);

  const stablePatientId = useRef(patientId || `patient_${Math.floor(Math.random() * 10000)}`).current;
  const hasFetchedToken = useRef(false);

  useEffect(() => {
    let mounted = true;
    let myClient = null;
    let myCall = null;

    const setupStream = async () => {
      if (hasFetchedToken.current) return;
      hasFetchedToken.current = true;

      try {
        setSetupState('Fetching secure token...');
        const response = await axios.get(`http://127.0.0.1:7860/generate-video-token?user_id=${stablePatientId}`);
        const { token, user_id, api_key } = response.data;

        if (!mounted) return;
        setCurrentCallId(callId);
        
        myClient = new StreamVideoClient({ apiKey: api_key, user: { id: user_id }, token: token });
        myCall = myClient.call('default', callId); 
        
        // Join the call first
        await myCall.join({ create: true });
        if (!mounted) return; 
        
        setSetupState('Requesting Camera & Mic permissions...');

        // 🚨 FIX: Explicitly catch permission denials!
        try {
            await myCall.camera.enable();
            await myCall.microphone.enable(); 
            console.log("✅ Camera & Mic successfully published to WebRTC!");
        } catch (mediaErr) {
            console.error("❌ Media permission denied:", mediaErr);
            if (mounted) setError('Camera or Microphone permission denied. Please allow access in your browser settings and refresh.');
            return;
        }

        if (mounted) {
          setClient(myClient);
          setCall(myCall);
          setSetupState('Agent listening...');
        }
      } catch (err) {
        console.error("❌ Stream Setup Error:", err);
        if (mounted) setError('Connection failed. Please check backend server.');
      }
    };

    if (callId) setupStream();

    return () => {
      mounted = false;
      hasFetchedToken.current = false;
      if (myCall) myCall.leave().catch(() => {});
      if (myClient) myClient.disconnectUser().catch(() => {});
    };
  }, [stablePatientId, callId]);

  useEffect(() => {
    let pollInterval;
    if (client && call && currentCallId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await axios.get(`http://127.0.0.1:7860/diagnostic-results/${currentCallId}`);
          if (res.status === 200 && res.data.status === 'complete') {
            clearInterval(pollInterval);
            setSetupState('Analysis finished!');
            setTimeout(() => onComplete(res.data.data), 1000);
          }
        } catch (err) {
          // Swallow 404s until agent is done
        }
      }, 3000); 
    }
    return () => { if (pollInterval) clearInterval(pollInterval); };
  }, [client, call, currentCallId, onComplete]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 border border-red-300 rounded-lg text-red-800 font-medium">
        {error}
      </div>
    );
  }

  return (
    <div className="my-4 p-4 bg-slate-900 rounded-lg border border-slate-700 shadow-2xl">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        {!client || !call ? (
          <div className="text-blue-400 font-mono text-xs flex flex-col items-center gap-2">
            <Activity className="w-6 h-6 animate-spin" />
            {setupState}
          </div>
        ) : (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <MicTester />
              
           {/* 🚨 THE TIME TRAVEL FIX: Only mount the flasher WHEN the test starts! */}
             {(visionTaskType === 'plr_test' || visionTaskType === 'functional_vision_analysis') && (
                <AutonomousFlashTest callId={currentCallId} />
             )}
              <StreamTheme>
                <SpeakerLayout participantsBarPosition="bottom" />
              </StreamTheme>
            </StreamCall>
          </StreamVideo>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={onCancel} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 rounded text-xs">
          Abort Scan
        </button>
      </div>
    </div>
  );
}
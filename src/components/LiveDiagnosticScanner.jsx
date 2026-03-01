import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AlertCircle, X, Activity, Mic } from 'lucide-react'; 
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  StreamTheme,
  SpeakerLayout,
  CallControls,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';

export default function LiveDiagnosticScanner({ 
  visionTaskType, 
  callId, // --- THE FIX: We receive the callId from App.js ---
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
        
        const response = await axios.get(`https://monotonousharshh-harsh-devs.hf.space/generate-video-token?user_id=${stablePatientId}`);
        // --- THE FIX: We no longer pull call_id from here, we just use the token! ---
        const { token, user_id, api_key } = response.data;

        if (!mounted) return;

        // --- THE FIX: Tell the Stream SDK to connect to the backend's room ---
        setCurrentCallId(callId);
        setSetupState('Connecting to Edge Network...');
        
        myClient = new StreamVideoClient({ apiKey: api_key, user: { id: user_id }, token: token });
        myCall = myClient.call('default', callId); 
        
        await myCall.join({ create: true });
        if (!mounted) return; 
        
        await myCall.camera.enable();
        if (!mounted) return; 

        await myCall.microphone.enable(); 

        if (mounted) {
          setClient(myClient);
          setCall(myCall);
          setSetupState('Video & Voice Tracking Active...');
        }
      } catch (err) {
        console.error('Failed to setup secure Stream connection:', err);
        if (mounted) setError('Failed to establish a secure video/audio connection. Ensure backend is running.');
      }
    };

    if (callId) {
      setupStream();
    }

    return () => {
      mounted = false;
      hasFetchedToken.current = false;

      if (myCall) {
        myCall.leave().catch(console.error);
      }
      if (myClient) {
        myClient.disconnectUser().catch(console.error);
      }
    };
  }, [stablePatientId, callId]);

  useEffect(() => {
    let pollInterval;

    if (client && call && currentCallId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await axios.get(`https://monotonousharshh-harsh-devs.hf.space/diagnostic-results/${currentCallId}`);
          
          if (res.data.status === 'complete') {
            clearInterval(pollInterval);
            setSetupState('Analysis complete. Transmitting to LangGraph...');
            
            setTimeout(() => {
              onComplete(res.data.data); 
            }, 1000);
          }
        } catch (err) {
          console.error("Error polling for results", err);
        }
      }, 2000); 
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [client, call, currentCallId, onComplete]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 border border-red-300 rounded-lg shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Connection Error</h3>
            <p className="text-sm text-red-700 mb-3">{error}</p>
            <button onClick={onCancel} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
              Cancel Diagnostic
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 bg-slate-900 rounded-lg border border-slate-700 shadow-2xl overflow-hidden">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        
        {!client || !call ? (
          <div className="text-blue-400 font-mono text-sm animate-pulse flex flex-col items-center gap-2">
            <Activity className="w-6 h-6 animate-spin" />
            {setupState}
          </div>
        ) : (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <StreamTheme>
                <SpeakerLayout participantsBarPosition="bottom" />
                <div className="hidden"><CallControls /></div>
              </StreamTheme>
            </StreamCall>
          </StreamVideo>
        )}

        {/* Overlays */}
        {client && call && (
          <>
            <div className="absolute top-4 left-4 bg-black/60 px-3 py-2 rounded-lg backdrop-blur-sm border border-slate-800 z-10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-white text-sm font-medium">
                  {visionTaskType === 'plr_test' ? 'Pupillary Reflex Tracking' : 'Live Vision Scan'}
                </span>
              </div>
            </div>

            <div className="absolute top-4 right-4 bg-black/60 px-3 py-2 rounded-lg backdrop-blur-sm border border-slate-800 z-10">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-blue-400" />
                <span className="text-white text-xs">Audio Active</span>
              </div>
            </div>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 z-10">
               <Activity className="w-4 h-4 text-green-400" />
               <span className="text-green-400 text-xs font-mono">{setupState}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex justify-between items-center">
        <p className="text-xs text-slate-400 font-mono">Multi-Modal Edge Network Active</p>
        <button 
          onClick={onCancel} 
          className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2 border border-slate-700"
        >
          <X className="w-4 h-4" />
          Abort Scan
        </button>
      </div>
    </div>
  );
}
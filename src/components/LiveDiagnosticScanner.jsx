import { useState, useEffect } from 'react';
import { Camera, AlertCircle, X } from 'lucide-react';

export default function LiveDiagnosticScanner({ visionTaskType, onComplete, onCancel }) {
  const [cameraPermission, setCameraPermission] = useState('pending');
  const [stream, setStream] = useState(null);

  useEffect(() => {
    let currentStream = null;

    const requestCameraAccess = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        currentStream = mediaStream;
        setStream(mediaStream);
        setCameraPermission('granted');
      } catch (error) {
        console.error('Camera access denied:', error);
        setCameraPermission('denied');
      }
    };

    requestCameraAccess();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSubmit = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    const dummyData = {
      pupil_latency_ms: 280,
      convergence_angle_deg: 12.5,
      tracking_accuracy: 0.94,
      timestamp: new Date().toISOString()
    };

    onComplete(dummyData);
  };

  const handleCancel = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onCancel();
  };

  if (cameraPermission === 'denied') {
    return (
      <div className="my-4 p-4 bg-red-50 border border-red-300 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Camera Access Denied</h3>
            <p className="text-sm text-red-700 mb-3">
              Camera access is required for live diagnostic scanning. Please enable camera permissions in your browser settings.
            </p>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Cancel Diagnostic
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cameraPermission === 'pending') {
    return (
      <div className="my-4 p-6 bg-slate-100 border border-slate-300 rounded-lg">
        <div className="flex items-center justify-center gap-3">
          <Camera className="w-5 h-5 text-slate-600 animate-pulse" />
          <p className="text-slate-700">Requesting camera access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 bg-slate-900 rounded-lg">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 border-2 border-green-500 rounded-full animate-ping opacity-75"></div>
            <div className="absolute inset-0 border-2 border-green-500 rounded-full"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-full bg-green-500 opacity-50"></div>
              <div className="absolute w-full h-1 bg-green-500 opacity-50"></div>
            </div>
          </div>
        </div>

        <div className="absolute top-4 left-4 bg-black bg-opacity-60 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">Live Diagnostic Active</span>
          </div>
        </div>

        {visionTaskType && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-60 px-3 py-2 rounded-lg">
            <span className="text-white text-sm">{visionTaskType}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3 justify-end">
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Submit Diagnostic Data
        </button>
      </div>
    </div>
  );
}

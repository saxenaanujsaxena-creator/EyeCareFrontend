import React, { useEffect, useState } from 'react';

export const MicTester = () => {
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    let audioContext;
    let animationId;

    const startListening = async () => {
      try {
        // Force the browser to request raw raw mic access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        microphone.connect(analyser);
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          // Calculate average volume level
          setVolume(sum / dataArray.length);
          animationId = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      } catch (err) {
        console.error("Microphone access denied:", err);
        setError("Mic Blocked by Browser/OS!");
      }
    };

    startListening();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext) audioContext.close();
    };
  }, []);

  return (
    <div style={{ 
      padding: '10px', 
      margin: '10px 0', 
      backgroundColor: '#1e1e1e', 
      color: '#00ff00', 
      borderRadius: '8px',
      fontFamily: 'monospace'
    }}>
      <b>Raw Hardware Mic Test:</b> {error && <span style={{color: 'red'}}>{error}</span>}
      <div style={{ marginTop: '5px', width: '100%', backgroundColor: '#333', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ 
          width: `${Math.min(volume * 2, 100)}%`, 
          backgroundColor: volume > 10 ? '#00ff00' : '#555', 
          height: '100%', 
          transition: 'width 0.05s ease-out' 
        }} />
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';

const ScreenFlashTest = ({ isTestActive, onTestComplete }) => {
  const [flashState, setFlashState] = useState('idle'); // 'idle', 'dark', 'flash'

  useEffect(() => {
    if (isTestActive) {
      // Step 1: Go Dark to dilate the pupil
      setFlashState('dark');
      
      // Step 2: Trigger the White Flash after 3 seconds (Baseline established)
      const flashTimer = setTimeout(() => {
        setFlashState('flash');
      }, 3000);

      // Step 3: End the test and return to normal after 3 more seconds
      const endTimer = setTimeout(() => {
        setFlashState('idle');
        if (onTestComplete) onTestComplete();
      }, 6000);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(endTimer);
      };
    }
  }, [isTestActive]);

  if (flashState === 'idle') return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        // The magic contrast toggle!
        backgroundColor: flashState === 'dark' ? '#111111' : '#FFFFFF',
        transition: flashState === 'flash' ? 'none' : 'background-color 0.5s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: flashState === 'dark' ? '#FFFFFF' : '#000000'
      }}
    >
      <h1 style={{ fontSize: '2rem', textAlign: 'center' }}>
        {flashState === 'dark' ? 'Please look directly at the camera...' : ''}
      </h1>
    </div>
  );
};

export default ScreenFlashTest;
import React, { useRef, useState, useEffect, useCallback } from 'react';

// Constants
const SESSION_TIMEOUT_WARNING_THRESHOLD = 60;
const MILLISECONDS_IN_SECOND = 1000;

function SessionTimeoutAlert({ loggedIn, logout, checkAuthentication, sessionTimeout, extendSessionTrigger }) {
  const [showAlert, setShowAlert] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_TIMEOUT_WARNING_THRESHOLD);

  const alertRef = useRef(null);
  const timeoutIdRef = useRef(null);
  const intervalIdRef = useRef(null);

  const handleClickOutside = useCallback((event) => {
    if (alertRef.current && !alertRef.current.contains(event.target)) {
      setShowAlert(false);
    }
  }, []);

  const extendSession = useCallback(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timeoutIdRef.current);
      clearInterval(intervalIdRef.current);
    };
  }, [handleClickOutside]);

  useEffect(() => {
    if (loggedIn) {
      clearTimeout(timeoutIdRef.current);
      setShowAlert(false);
      
      const delayTime = Math.max(
        (sessionTimeout - SESSION_TIMEOUT_WARNING_THRESHOLD) * MILLISECONDS_IN_SECOND, 
        500
      );
      
      timeoutIdRef.current = setTimeout(() => setShowAlert(true), delayTime);
    } else {
      setShowAlert(false);
    }

    return () => clearTimeout(timeoutIdRef.current);
  }, [loggedIn, sessionTimeout, extendSessionTrigger]);

  useEffect(() => {
    if (showAlert) {
      setTimeLeft(Math.min(SESSION_TIMEOUT_WARNING_THRESHOLD, sessionTimeout));
      
      intervalIdRef.current = setInterval(() => {
        setTimeLeft((prevTimeLeft) => {
          const newTimeLeft = prevTimeLeft - 1;

          if (newTimeLeft <= 0) {
            clearInterval(intervalIdRef.current);
            setShowAlert(false);
            // Potentially add other actions when the session timeout is reached
          }

          return newTimeLeft;
        });
      }, MILLISECONDS_IN_SECOND);
    }

    return () => {
      clearInterval(intervalIdRef.current);
    };
  }, [showAlert, sessionTimeout]);

  if (!showAlert) return null;

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />
      <div 
        ref={alertRef} 
        style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          backgroundColor: 'white', 
          padding: '1em', 
          border: '1px solid black', 
          zIndex: 1,
          borderRadius: '4px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        role="dialog"
        aria-labelledby="session-timeout-title"
      >
        <h1 id="session-timeout-title">Session Timeout</h1>
        <p>Your session will expire in {timeLeft} seconds. Do you want to extend it?</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={handleLogout}>Log Out</button>
          <button className="ml-1" onClick={extendSession}>Extend Session</button>
        </div>
      </div>
    </>
  );
}

export default SessionTimeoutAlert;

import React, { useRef, useState, useEffect } from 'react';

// Constants
const SESSION_TIMEOUT_WARNING_THRESHOLD = 60;
const MILLISECONDS_IN_SECOND = 1000;

function SessionTimeoutAlert({ loggedIn, logout, checkAuthentication, setLoggedIn, sessionTimeout, extendSessionTrigger }) {
  const [showAlert, setShowAlert] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_TIMEOUT_WARNING_THRESHOLD);

  const alertRef = useRef();
  const timeoutIdRef = useRef();
  const intervalIdRef = useRef();

  const handleClickOutside = (event) => {
    if (alertRef.current && !alertRef.current.contains(event.target)) {
      setShowAlert(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timeoutIdRef.current);
      clearInterval(intervalIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (loggedIn) {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      setShowAlert(false);
      timeoutIdRef.current = setTimeout(() => setShowAlert(true), Math.max((sessionTimeout - SESSION_TIMEOUT_WARNING_THRESHOLD) * MILLISECONDS_IN_SECOND, 500));
    } else {
      setShowAlert(false);
    }

    return () => clearTimeout(timeoutIdRef.current);
  }, [loggedIn, sessionTimeout, extendSessionTrigger]);

  useEffect(() => {
    if (showAlert) {
      intervalIdRef.current = setInterval(() => {
        setTimeLeft((prevTimeLeft) => {
          const newTimeLeft = prevTimeLeft - 1;

          if (newTimeLeft <= 0) {
            setShowAlert(false);
            // Potentially add other actions when the session timeout is reached
          }

          return newTimeLeft;
        });
      }, MILLISECONDS_IN_SECOND);
    }

    return () => {
      clearInterval(intervalIdRef.current);
      setTimeLeft(Math.min(SESSION_TIMEOUT_WARNING_THRESHOLD, sessionTimeout));
    };
  }, [showAlert, sessionTimeout]);

  const extendSession = () => {
    checkAuthentication();
  };

  const handleLogout = () => {
    logout();
  };

  if (!showAlert) return null;

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />
      <div ref={alertRef} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '1em', border: '1px solid black', zIndex: 1 }}>
        <h1>Session Timeout</h1>
        <p>Your session will expire in {timeLeft} seconds. Do you want to extend it?</p>
        <button onClick={handleLogout}>Log Out</button>
        <button className="ml-1" onClick={extendSession}>Extend Session</button>
      </div>
    </>
  );
}

export default SessionTimeoutAlert;

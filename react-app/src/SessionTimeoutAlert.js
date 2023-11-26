import React, { useRef, useState, useEffect } from 'react';

function SessionTimeoutAlert({ loggedIn, logout, checkAuthentication, setLoggedIn, sessionTimeout, extendSessionTrigger }) {
  const [showAlert, setShowAlert] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const alertRef = useRef();
  const timeoutIdRef = useRef();

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
    };
  }, []);

  

  useEffect(() => {
    if (loggedIn) {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      setShowAlert(false);
      timeoutIdRef.current = setTimeout(() => setShowAlert(true), Math.max((sessionTimeout - 60) * 1000, 500));
    } else {
      setShowAlert(false);
    }

    return () => clearTimeout(timeoutIdRef.current);
  }, [loggedIn, sessionTimeout, extendSessionTrigger]);

  useEffect(() => {
    let intervalId;

    if (showAlert) {
      intervalId = setInterval(() => {
        setTimeLeft((prevTimeLeft) => {
          const newTimeLeft = prevTimeLeft - 1;

          if (newTimeLeft <= 0) {
            setShowAlert(false);
            // Potentially add other actions when the session timeout is reached
          }

          return newTimeLeft;
        });
      }, 1000);
    }

    return () => {
      clearInterval(intervalId);
      setTimeLeft(60);
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

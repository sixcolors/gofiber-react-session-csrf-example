import Cookies from 'js-cookie';
import './App.css';
import SessionTimeoutAlert from './SessionTimeoutAlert';
import React, { useRef, useState, useEffect, createContext, useContext, useCallback } from 'react';

// Constants
const DEFAULT_SESSION_TIMEOUT = 3600;
const MILLISECONDS_IN_SECOND = 1000;
const API_AUTH_LOGIN = '/api/auth/login';
const API_AUTH_LOGOUT = '/api/auth/logout';
const API_AUTH_STATUS = '/api/auth/status';
const API_THINGAMABOB = '/api/thingamabob';
const LAST_API_REQUEST_DATE = 'lastApiRequestDate';

const AuthContext = createContext();

// Create a provider component for the AuthContext
const AuthProvider = ({ children }) => {
  const [username, setUsername] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [sessionTimeout, setSessionTimeout] = useState(DEFAULT_SESSION_TIMEOUT);
  const [extendSessionTrigger, setExtendSessionTrigger] = useState(0);

  const checkAuthenticationRef = useRef();
  const apiRequestRef = useRef();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const apiRequest = useCallback(async (url, options, csrfRefreshed = false) => {
    const csrfToken = Cookies.get('csrf_');

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'X-CSRF-Token': csrfToken,
      },
    });

    // Check if the response status code is 403 (Forbidden)
    // This will happen if the CSRF token is invalid or missing
    if (response.status === 403) {
      if (csrfRefreshed) {
        checkAuthenticationRef.current();
        return null;
      }

      // Call the /api endpoint ('Hello World' endpoint) with the GET method
      // This will set a new CSRF cookie
      await fetch('/api', { method: 'GET' });

      // Call the apiRequest function again with the same parameters
      return apiRequest(url, options, true);
    }

    // Check if the status code is 401 (Unauthorized) and Call checkAuthentication again
    // unless checking the API_AUTH_STATUS endpoint, to avoid an infinite loop
    if (response.status === 401 && url !== API_AUTH_STATUS) {
      checkAuthenticationRef.current(); // This will, most likely, set loggedIn to false
      return null; // Return null so the caller knows the request failed
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    // Store the current date and time in the local storage
    localStorage.setItem(LAST_API_REQUEST_DATE, Date.now());

    // Trigger the session timeout alert to extend the session
    setExtendSessionTrigger(extendSessionTrigger + 1);

    // If the response status is 204 (No Content), return null
    if (response.status === 204) {
      return null;
    }

    // Otherwise, parse the response body as JSON
    return response.json();
  }, [extendSessionTrigger]);

  const logout = useCallback(async () => {
    try {
      await apiRequest(API_AUTH_LOGOUT, { method: 'POST' });
      console.log('Logout successful');
      setLoggedIn(false);
      setUsername('');
      setUserRoles([]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [apiRequest, setLoggedIn, setUsername, setUserRoles]);

  const checkAuthentication = useCallback(async () => {
    try {
      const statusData = await apiRequestRef.current(API_AUTH_STATUS, { method: 'GET' })
      if (!statusData) {
        // the user is not logged in
        setLoggedIn(false);
        setUsername('');
        setUserRoles([]);
        return;
      }
      setLoggedIn(statusData.loggedIn);
      setUsername(statusData.username || '');
      setUserRoles(statusData.roles || []);
      setSessionTimeout(statusData.sessionTimeout || DEFAULT_SESSION_TIMEOUT);
    } catch (error) {
      console.error('Authentication check failed:', error);
      setLoggedIn(false);
      setUsername('');
      setUserRoles([]);
    }
  }, [apiRequestRef, setUsername, setLoggedIn, setUserRoles]);

  useEffect(() => {
    checkAuthenticationRef.current = checkAuthentication;
  }, [checkAuthentication]);

  useEffect(() => {
    apiRequestRef.current = apiRequest;
  }, [apiRequest]);

  // Check authentication when the component mounts
  useEffect(() => {
    checkAuthenticationRef.current();
  }, []);

  useEffect(() => {
    let timeoutId;

    const setAuthenticationTimeout = (lastApiRequestDate) => {
      const now = Date.now();
      const timeSinceLastApiRequest = now - lastApiRequestDate;

      if (timeSinceLastApiRequest < sessionTimeout * MILLISECONDS_IN_SECOND) {
        // If a timer is already running, clear it
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Set a new timer to check the authentication status after the remaining time, plus 1 second
        const remainingTime = sessionTimeout * MILLISECONDS_IN_SECOND - timeSinceLastApiRequest + 1 * MILLISECONDS_IN_SECOND;
        timeoutId = setTimeout(() => {
          checkAuthenticationRef.current();
        }, remainingTime);
      }
    }

    const handleStorageChange = (e) => {
      if (e.key === LAST_API_REQUEST_DATE) {
        // Trigger the SessionTimeoutAlert when the lastApiRequestDate changes
        setExtendSessionTrigger(extendSessionTrigger + 1);

        const lastApiRequestDate = parseInt(e.newValue);
        setAuthenticationTimeout(lastApiRequestDate);
      }
    }

    window.addEventListener('storage', handleStorageChange);

    const lastApiRequestDate = parseInt(localStorage.getItem(LAST_API_REQUEST_DATE));
    setAuthenticationTimeout(lastApiRequestDate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);

      // Clear the timer when the component unmounts
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [sessionTimeout, extendSessionTrigger, checkAuthenticationRef]);


  return (
    <AuthContext.Provider
      value={{
        username,
        loggedIn,
        userRoles,
        logout,
        apiRequest,
        setLoggedIn,
        setUsername,
        setUserRoles,
        checkAuthentication,
        sessionTimeout,
        setSessionTimeout,
        extendSessionTrigger,
        setExtendSessionTrigger,
      }}
    >
      <SessionTimeoutAlert
        loggedIn={loggedIn}
        logout={logout}
        checkAuthentication={checkAuthentication}
        sessionTimeout={sessionTimeout}
        setLoggedIn={setLoggedIn}
        extendSessionTrigger={extendSessionTrigger}
      />
      {children}
    </AuthContext.Provider>
  );
};

function AuthorizedContent() {
  const { username, userRoles, apiRequest, logout } = useContext(AuthContext);
  const [thingamabobs, setThingamabobs] = useState([]);

  const apiRequestRef = useRef(apiRequest);
  apiRequestRef.current = apiRequest;

  const getThingamabobs = useCallback(async () => {
    try {
      const data = await apiRequestRef.current(API_THINGAMABOB, { method: 'GET' });
      setThingamabobs(data);
    } catch (error) {
      console.error(error);
    }
  }, [setThingamabobs]);

  // Get thingamabobs when the component mounts
  useEffect(() => {
    getThingamabobs();
  }, [getThingamabobs]);

  const handleLogout = async (e) => {
    e.preventDefault();

    logout();
  };

  const handleAddThingamabob = async (e, { name }) => {
    e.preventDefault();

    try {
      const data = await apiRequest(API_THINGAMABOB, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      setThingamabobs([...thingamabobs, data]);
      e.target.reset();
    } catch (error) {
      alert(error.message);
      console.error(error);
    }
  };

  const handleDeleteThingamabob = async (id) => {
    try {
      if (!Number.isInteger(id)) {
        throw new Error('Invalid id');
      }

      await apiRequest(`${API_THINGAMABOB}/${id}`, { method: 'DELETE' });
      setThingamabobs(thingamabobs.filter(thingamabob => thingamabob.id !== id));
    } catch (error) {
      alert(error.message);
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Welcome, {username}!</h2>
      <p>User Roles: {userRoles?.join(', ')}</p>
      <hr />
      <h3>Thingamabobs (Authorized Content)</h3>
      <ul>
        {thingamabobs.map(thingamabob => (
          <li key={thingamabob.id}>
            {thingamabob.name}
            {userRoles.includes('admin') && (
              <button className="danger ml-1" onClick={() => { handleDeleteThingamabob(thingamabob.id) }}>Delete</button>
            )}
          </li>
        ))}
      </ul>
      {userRoles.includes('admin') && (
        <div>
          <h3>Add Thingamabob</h3>
          <form onSubmit={(e) => handleAddThingamabob(e, { name: e.target.name.value })}>
            <label>Name:</label>
            <input type="text" name="name" placeholder='Thingamabob #' />
            <button type="submit">Add Thingamabob</button>
          </form>
        </div>
      )}
      <hr />
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

function LoginPage() {
  const [fromUsername, setFromUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [error, setError] = useState('');
  const { setSessionTimeout, setUsername, setLoggedIn, setUserRoles, apiRequest } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const { loggedIn, username, roles, sessionTimeout } = await apiRequest(API_AUTH_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fromUsername, password: formPassword }),
      });

      setLoggedIn(loggedIn);
      setUsername(username);
      setUserRoles(roles);
      setSessionTimeout(sessionTimeout || DEFAULT_SESSION_TIMEOUT);
      setError(''); // Clear the error state on successful login
      console.log('Login successful');
    } catch (error) {
      console.error(error);
      setError('Login failed');
    }
  };

  return (
    <div>
      <h2>Login Page</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            value={fromUsername}
            onChange={(e) => setFromUsername(e.target.value)}
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
          />
        </div>
        <div>
          <button type="submit">Login</button>
        </div>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { loggedIn } = useContext(AuthContext); // Access the loggedIn state

  return (
    <div className="main-content">
      <h1>Example React Frontend</h1>
      {loggedIn ? <AuthorizedContent /> : <LoginPage />}
    </div>
  );
}

export default App;

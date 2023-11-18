import Cookies from 'js-cookie';
import './App.css';
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

const UserContext = createContext();

const apiRequest = async (url, options) => {
  const csrfToken = Cookies.get('csrf_');
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': csrfToken,
    },
  });

  // TODO: Check if the status code is 401 (Unauthorized) and Call checkAuthentication again

  if (!response.ok) {
    throw new Error(`Request failed: ${response.statusText}`);
  }

  // If the response status is 204 (No Content), return null
  if (response.status === 204) {
    return null;
  }

  // Otherwise, parse the response body as JSON
  return response.json();
};

function AuthorizedContent() {
  const { username, setUsername, userRoles, setUserRoles, setLoggedIn } = useContext(UserContext);
  const [thingamabobs, setThingamabobs] = useState([]);

  const getThingamabobs = useCallback(async () => {
    try {
      const data = await apiRequest('/api/thingamabob', { method: 'GET' });
      setThingamabobs(data);
    } catch (error) {
      console.error(error);
    }
  }, [setThingamabobs]);

  useEffect(() => {
    getThingamabobs();
  }, [getThingamabobs]);

  const handleLogout = async (e) => {
    e.preventDefault();

    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });

      const statusData = await apiRequest('/api/auth/status', { method: 'GET' });
      setLoggedIn(statusData.loggedIn);
      setUsername(statusData.username || '');
      setUserRoles(statusData.roles || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddThingamabob = async (e, { name }) => {
    e.preventDefault();

    try {
      const data = await apiRequest('/api/thingamabob', {
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
      await apiRequest(`/api/thingamabob/${id}`, { method: 'DELETE' });
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
              <button className="danger ml-1" onClick={() => {handleDeleteThingamabob(thingamabob.id)}}>Delete</button>
            )}
          </li>
        ))}
      </ul>
      {userRoles.includes('admin') && (
        <div>
          <h3>Add Thingamabob</h3>
          <form onSubmit={(e) => handleAddThingamabob(e, { name: e.target.name.value })}>
            <label>Name:</label>
            <input type="text" name="name" placeholder='Thingamabob #'/>
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
  const { setUsername, setLoggedIn, setUserRoles } = useContext(UserContext);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fromUsername, password: formPassword }),
      });

      setLoggedIn(data.loggedIn);
      setUsername(data.username);
      setUserRoles(data.roles);
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
  const [username, setUsername] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRoles, setUserRoles] = useState([]);

  const checkAuthentication = useCallback(async () => {
    try {
      const statusData = await apiRequest('/api/auth/status', { method: 'GET' });
      setLoggedIn(statusData.loggedIn);
      setUsername(statusData.username || '');
      setUserRoles(statusData.roles || []);
    } catch (error) {
      console.error(error);
      setLoggedIn(false);
      setUsername('');
      setUserRoles([]);
    }
  }, [setUsername, setLoggedIn, setUserRoles]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  return (
    <UserContext.Provider value={{ username, setUsername, userRoles, setUserRoles, loggedIn, setLoggedIn }}>
      <div className="main-content">
        <h1>Example React Frontend</h1>
        {loggedIn ? <AuthorizedContent /> : <LoginPage />}
      </div>
    </UserContext.Provider>
  );
}

export default App;

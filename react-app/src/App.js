import Cookies from 'js-cookie';
import './App.css';
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Create a context
const UserContext = createContext();

// AuthorizedContent component to display authorized content
function AuthorizedContent() {
  const { username, setUsername, userRoles, setUserRoles, setLoggedIn } = useContext(UserContext);
  const [thingamabobs, setThingamabobs] = useState([]);

  const getThingamabobs = useCallback(() => {
    // get csrf token from cookie 'csrf_'
    const csrfToken = Cookies.get('csrf_');

    // Make a request to the API to get thingamabobs
    fetch('/api/thingamabob', {
      method: 'GET', // Use GET request
      headers: {
        'X-CSRF-Token': csrfToken, // pass csrf token in header
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Get thingamabobs failed');
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);
        if (!data) {
          throw new Error('Get thingamabobs failed');
        }
      
        setThingamabobs(data);
      })
      .catch((error) => {
        console.error(error);
      });
  }
  , [setThingamabobs]);

  // Call the getThingamabobs function when the component mounts
  useEffect(() => {
    getThingamabobs();
  }, [getThingamabobs]);

  const handleLogout = async (e) => {
    e.preventDefault();

    // get csrf token from cookie 'csrf_'
    const csrfToken = Cookies.get('csrf_');

    // Make a request to the API to logout the user
    fetch('/api/auth/logout', {
      method: 'POST', // Use POST request
      headers: {
        'Content-Type': 'application/json', // Specify content type
        'X-CSRF-Token': csrfToken, // pass csrf token in header
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Logout failed');
        }
        return response.json();
      })
      .then((data) => {
        // call the status endpoint to check if the user is logged in and get a new csrf token
        fetch('/api/auth/status')
        .then((response) => {
          if (!response.ok) {
            throw new Error('Logout failed');
          }
          return response.json();
        })
        .then((data) => {
          setLoggedIn(data.loggedIn);
          setUsername(data.username || '');
          setUserRoles(data.roles || []);
        })
        .catch((error) => {
          console.error(error);
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  const handleAddThingamabob = async (e, thingamabob) => {
    e.preventDefault();

    // get csrf token from cookie 'csrf_'
    const csrfToken = Cookies.get('csrf_');

    // Make a request to the API to add a thingamabob
    fetch('/api/thingamabob', {
      method: 'POST', // Use POST request
      headers: {
        'Content-Type': 'application/json', // Specify content type
        'X-CSRF-Token': csrfToken, // pass csrf token in header
      },
      body: JSON.stringify(thingamabob), // stringify JSON data
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Add thingamabob failed');
        }
        return response.json();
      })
      .then((data) => {
        // add the new thingamabob to the list of thingamabobs
        setThingamabobs([...thingamabobs, data]);
        // reset the form
        e.target.reset();
      })
      .catch((error) => {
        alert(error);
        console.error(error);
      });
  }

  const handleDeleteThingamabob = async (id) => {
    // get csrf token from cookie 'csrf_'
    const csrfToken = Cookies.get('csrf_');

    // Make a request to the API to delete a thingamabob
    fetch(`/api/thingamabob/${id}`, {
      method: 'DELETE', // Use DELETE request
      headers: {
        'X-CSRF-Token': csrfToken, // pass csrf token in header
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Delete thingamabob failed');
        }
        setThingamabobs(thingamabobs.filter(thingamabob => thingamabob.id !== id));
      })
      .catch((error) => {
        alert(error);
        console.error(error);
      });
  }

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
      {/* Add your authorized content here */}
    </div>
  );
}

// LoginPage component to display the login page and form
function LoginPage() {
  const [fromUsername, setFromUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');

  const [error, setError] = useState('');
  const { setUsername, setLoggedIn, setUserRoles } = useContext(UserContext);

  // Function to handle form submission
  const handleLogin = async (e) => {
    e.preventDefault();

    // get csrf token from cookie 'csrf_'
    const csrfToken = Cookies.get('csrf_');

    // Make a request to the API to login the user
    fetch('/api/auth/login', {
      method: 'POST', // Use POST request
      headers: {
        'Content-Type': 'application/json', // Specify content type
        'X-CSRF-Token': csrfToken, // pass csrf token in header
      },
      body: JSON.stringify({ username: fromUsername, password: formPassword }), // stringify JSON data
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Login failed');
        }
        return response.json();
      })
      .then((data) => {
        setLoggedIn(data.loggedIn);
        setUsername(data.username);
        setUserRoles(data.roles);
        console.log('success');
      })
      .catch((error) => {
        console.error(error);
        setError('Login failed');
      });
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

  // Function to check authentication status
  const checkAuthentication = useCallback(() => {
    // get csrf token from cookie 'csrf_'
    const csrfToken = Cookies.get('csrf_token');

    // Make a request to the API to check if the user is logged in
    fetch('/api/auth/status', {
      method: 'GET', // Use GET request
      headers: {
        'X-CSRF-Token': csrfToken, // pass csrf token in header
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Authentication failed');
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);
        setLoggedIn(data.loggedIn);
        setUsername(data.username || '');
        setUserRoles(data.roles || []);
      })
      .catch((error) => {
        console.error(error);
        setLoggedIn(false);
        setUsername('');
        setUserRoles([]);
      });
    
  }, [setUsername, setLoggedIn, setUserRoles]);

  // Call the checkAuthentication function when the component mounts
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
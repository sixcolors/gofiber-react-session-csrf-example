# Example GoFiber Backend with React Frontend using Sessions and CSRF

This is an example of a GoFiber backend with a React frontend that uses sessions and CSRF tokens.

It uses an nginx reverse proxy to serve the frontend and backend on the same port. The backend is served on `/api` and the frontend is served on `/`.

This is an overly simplified example just to show how to handle sessions with csrf tokens from a front end. It is not meant to be used in production.

It still needs the following:

- [ ] Secure handling of login credentials in the backend
- [ ] Docker compose
- [ ] Seperate frontend and backend docker containers
- [ ] Timeouts on the frontend
- [ ] Mechanism to refresh auth status on the frontend (if auth error happens, or the user does something that changes their auth status)
- [ ] Some browsers (Safari) will not offer to save passwords when using fetch and require a page load to trigger the save password dialog, fix.


## Running

```bash
docker build -t gofiber-react-session-csrf-example .
docker run -p 8080:8080 gofiber-react-example
```

The server will be available at [http://localhost:8080](http://localhost:8080).

## Credentials

There are two users:

- `admin` with password `admin`
- `user` with password `user`

## API

### `POST /api/auth/login`

request:
```json
{
  "username": "admin",
  "password": "admin"
}
```

response:
```json
{
    "loggedIn": true,
    "username": "admin",
    "roles": ["admin", "user"]
}
```

### `POST /api/auth/logout`

request:
```json
{}
```

response:
```json
{
    "loggedIn": false,
}
```

### `GET /api/auth/status`

response:
```json
{
  "loggedIn": true,
  "username": "admin",
  "roles": ["admin", "user"]
}
```

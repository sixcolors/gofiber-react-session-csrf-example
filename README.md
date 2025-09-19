# Example GoFiber Backend with React Frontend using Sessions and CSRF

**Note:** This is an example has been updated to use the latest GoFiber v3 beta version. You can check the [v2](https://github.com/sixcolors/gofiber-react-session-csrf-example/tree/v2) branch for the a version that uses GoFiber v2.

This is an example of a GoFiber backend with a React frontend that uses sessions and CSRF tokens.

Inspired by https://redis.com/blog/json-web-tokens-jwt-are-dangerous-for-user-sessions/ and developer questions about such a use case on the GoFiber discord server. 

It uses an nginx reverse proxy to serve the frontend and backend on the same port. The backend is served on `/api` and the frontend is served on `/`.

This example is not complete and therefore should not be used in production.

It still needs the following:

- [x] Docker compose for development (see [docker-compose.yml](docker-compose.yml))
- [x] React Dev Tools do not work with the proxy, fix
- [x] Go Delve remote debugger (see [launch.json](.vscode/launch.json)) `Docker: Attach to Go (Delve)` config for debugging the backend in VSCode
- [x] React debugging (see [launch.json](.vscode/launch.json)) `Launch Chrome against localhost` config for debugging the frontend in VSCode
- [ ] Seperate frontend and backend docker containers
- [ ] SECURE Dockerfiles (ie dont run as root etc)
- [x] Secure handling of login credentials in the backend
- [x] Timeouts on the frontend
- [x] Mechanism to refresh auth status on the frontend (if auth error happens, or the user does something that changes their auth status)
- [x] TODO: session timeout in the front end with multiple tabs open could cause the session to be extended indefinitely, fix
- [ ] Some browsers (Safari) will not offer to save passwords when using fetch and require a page load to trigger the save password dialog, fix


## Development

A docker-compose file is provided for development. It will start the backend, frontend and a redis cache.

```bash
docker compose up
```

The server will be available at [http://localhost:8080](http://localhost:8080).

To support web socket based hot reloading of the frontend, Ngix is configured to proxy_pass `/ws` requests to the frontend container.

Note: React Dev Tools require ENV `WDS_SOCKET_PORT` to be set to `8080` to work with the proxy, (see [react-app/Dockerfile.dev](react-app/Dockerfile.dev)).

The backend will be restarted when changes are made to the backend code using [air](github.com/air-verse/air).

Go delve remote debugger will be available at [http://localhost:2345](http://localhost:2345) (see [launch.json](.vscode/launch.json)) `Docker: Attach to Go (Delve)` config for debugging the backend in VSCode.

## Production

```bash
docker build -t gofiber-react-session-csrf-example .
docker run -p 8080:8080 gofiber-react-session-csrf-example
```

The server will be available at [http://localhost:8080](http://localhost:8080).

## Credentials

There are two users with securely hashed passwords (using Argon2id):

- `admin` with password `admin`
- `user` with password `user`

## Security Features

This example demonstrates secure authentication practices:
- **Password Hashing**: Argon2id for secure password storage.
- **Rate Limiting**: 10 login attempts per minute per IP to prevent brute force.
- **Timing Attack Mitigation**: Constant-time password verification.
- **CSRF Protection**: Token-based CSRF prevention using sessions.
- **Session Management**: Secure session handling with regeneration and timeouts.

**Note**: For production, enable HTTPS, set `CookieSecure: true`, and use environment variables for sensitive config.

## API

### `POST /api/auth/login`

Rate limited to 10 requests per minute per IP address.

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
    "roles": ["admin", "user"],
    "sessionTimeout": 3600 // seconds
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
  "roles": ["admin", "user"],
  "sessionTimeout": 3600 // seconds
}
```

### `GET /api/thingamabob`

response:
```json
[
  {
    "id": 1,
    "name": "Thingamabob 1"
  },
  {
    "id": 2,
    "name": "Thingamabob 2"
  }
]
```

### `POST /api/thingamabob`

request:
```json
{
  "name": "Thingamabob 3"
}
```

response:
```json
{
  "id": 3,
  "name": "Thingamabob 3"
}
```

### `GET /api/thingamabob/:id`

response:
```json
{
  "id": 1,
  "name": "Thingamabob 1"
}
```

### `PUT /api/thingamabob/:id`

request:
```json
{
  "name": "Thingamabob 1 Updated"
}
```

response:
```json
{
  "id": 1,
  "name": "Thingamabob 1 Updated"
}
```

### `DELETE /api/thingamabob/:id`

response:
```http
204 No Content
```

## License

MIT

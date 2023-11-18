# Example GoFiber Backend with React Frontend using Sessions and CSRF

This is an example of a GoFiber backend with a React frontend that uses sessions and CSRF tokens.

It uses an nginx reverse proxy to serve the frontend and backend on the same port. The backend is served on `/api` and the frontend is served on `/`.

This example is not complete and therefore should not be used in production.

It still needs the following:

- [x] Docker compose for development (see [docker-compose.yml](docker-compose.yml))
- [x] React Dev Tools do not work with the proxy, fix
- [x] Go Delve remote debugger (see [launch.json](.vscode/launch.json)) `Docker: Attach to Go (Delve)` config for debugging the backend in VSCode.
- [ ] React remote debugger (see [launch.json](.vscode/launch.json)) `Docker: Attach to node` config for debugging the frontend in VSCode.
- [ ] Seperate frontend and backend docker containers
- [ ] SECURE Dockerfiles (ie dont run as root etc)
- [ ] Secure handling of login credentials in the backend
- [ ] Timeouts on the frontend
- [ ] Mechanism to refresh auth status on the frontend (if auth error happens, or the user does something that changes their auth status)
- [ ] Some browsers (Safari) will not offer to save passwords when using fetch and require a page load to trigger the save password dialog, fix.


## Development

A docker-compose file is provided for development. It will start the backend, frontend and a redis cache.

The backend will be restarted when changes are made to the backend code using [air](https://github.com/cosmtrek/air).

To support web socket based hot reloading of the frontend, the frontend is served on port 3000 and the Ngix reverse proxy is configured to proxy `/ws` requests to the frontend container.

Note: React Dev Tools require `WDS_SOCKET_PORT` to be set to `8080` to work with the proxy.

```bash
docker-compose up
```

The server will be available at [http://localhost:8080](http://localhost:8080).

Go delve remote debugger will be available at [http://localhost:2345](http://localhost:2345) (see [launch.json](.vscode/launch.json)) `Docker: Attach to Go (Delve)` config for debugging the backend in VSCode.

## Production

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

### `GET /api/thingamabob`

response:
```json
{
  rows: [
    {
      "id": 1,
      "name": "Thingamabob 1"
    },
    {
      "id": 2,
      "name": "Thingamabob 2"
    }
  ]
}
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

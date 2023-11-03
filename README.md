# Example GoFiber Backend with React Frontend using Sessions and CSRF

This is an example of a GoFiber backend with a React frontend that uses sessions and CSRF tokens.

It uses an nginx reverse proxy to serve the frontend and backend on the same port. The backend is served on `/api` and the frontend is served on `/`.

## Running

```bash
docker build -t gofiber-react-session-csrf-example .
docker run -p 8080:8080 gofiber-react-example
```

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


## Running

```bash
docker build -t gofiber-react-session-csrf-example .
docker run -p 8080:8080 gofiber-react-example
```

# Stage 1: Build the React app
FROM node:latest as react-build

WORKDIR /app
COPY ./react-app/package.json ./react-app/package-lock.json ./
RUN npm install
COPY ./react-app ./
RUN npm run build

# Stage 2: Build the GoFiber backend
FROM golang:latest as go-build

WORKDIR /go/src/app
COPY ./go-fiber .

RUN go get -d -v ./...
RUN go build -o /go/bin/app

# Stage 3: Create the final image
FROM nginx:latest

# Remove the default NGINX configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy the React app build files to the NGINX web root
COPY --from=react-build /app/build /usr/share/nginx/html

# Copy the GoFiber binary to the NGINX container
COPY --from=go-build /go/bin/app /usr/share/nginx/html/api

# Copy the NGINX configuration
COPY ./nginx.conf /etc/nginx/conf.d/

# Run GoFiber binary
RUN chmod +x /usr/share/nginx/html/api

COPY ./startup.sh /app/startup.sh

# Expose port 8080
EXPOSE 8080

# Start NGINX in the foreground on port 8080
CMD ["sh", "/app/startup.sh"]

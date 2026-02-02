# Pass & Play Web Monopoly

Simple Monopoly game to play with friends in real life.

## Prerequisites

Make sure to have Docker Engine + Docker Compose plugin installed.

## Run the game on your local machine:

1. Clone the project to your machine:

```angular2html
git clone 
cd web-monopoly
```

2. Start the containers:
```angular2html
docker compose up --build
```

3. Open the link in your browser:

[localhost:5173](http://localhost:5173/)

4. After done playing, press `ctrl+C`, then:

```angular2html
docker compose down
```
## Stack

- FastAPI & Python for the server
- React + Vite with Javascript for the client
- Docker for containerizing

## Customize Images

If you feel like the current images are not to your liking, you may change the files in `workspaces/client/src/images` with the exact same file name.
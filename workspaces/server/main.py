from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import game_routes
app = FastAPI()

# fastapi dev workspaces/server/main.py

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(game_routes.router, prefix="/game", tags=["game"])

@app.get("/")
async def something():
    return {"Status": "running"}
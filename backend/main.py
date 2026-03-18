"""
AI-Powered Decision Intelligence Platform
FastAPI Backend - Main Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from routers import dataset, ml, insights

app = FastAPI(
    title="AI Decision Intelligence Platform",
    description="Upload datasets, generate ML predictions, and AI-powered business insights",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://decision-iq-platform.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded files as static
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register routers
app.include_router(dataset.router, prefix="/api", tags=["Dataset"])
app.include_router(ml.router, prefix="/api", tags=["Machine Learning"])
app.include_router(insights.router, prefix="/api", tags=["AI Insights"])


@app.get("/")
async def root():
    return {
        "message": "AI Decision Intelligence Platform API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
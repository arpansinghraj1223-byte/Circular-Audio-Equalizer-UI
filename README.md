# Pre-Interview Assignment — Fullstack (Frontend + Backend)

This repository contains a complete GitHub-ready sample for:
- **Frontend**: Circular audio equalizer UI, microphone capture, sends audio chunks to backend.
- **Backend**: Spring Boot WebFlux WebSocket server that accepts audio chunks and streams transcription back.

> NOTE: The current backend includes a **simulated Gemini streaming service**. Replace the stub in `GeminiStreamingService` with real integration (see comments) and set your API keys as environment variables.

## Project layout
- `frontend/` — static frontend files (index.html, app.js, styles.css)
- `backend/` — Spring Boot WebFlux backend

## Requirements
- Java 17+, Maven 3.6+
- Node not required (frontend is static), but you can serve with any static server or Docker.
- (Optional) Docker for containers.

## Running locally (dev)

### Backend


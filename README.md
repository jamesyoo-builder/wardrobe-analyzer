# AI Wardrobe Analyzer

A browser-based web app that uses AI vision to analyze clothing from your camera or uploaded photos — extracting color, type, fit, material, and more — and stores everything in a searchable wardrobe catalog.

## Prerequisites

- Node.js >= 18
- A modern browser (Chrome, Firefox, Safari) with webcam support
- An OpenAI API key (or compatible vision API)

## Quick Start

```bash
git clone https://github.com/jamesyoo-builder/wardrobe-analyzer.git
cd wardrobe-analyzer
npm install
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
npm start
```

Open http://localhost:3000 in your browser.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | Your OpenAI API key (required for server mode) |
| `OPENAI_API_BASE` | `https://api.openai.com/v1` | API base URL |
| `MODEL_NAME` | `gpt-4o` | Vision-capable model name |
| `PORT` | `3000` | Server port |

## Deployment

### Render
1. Connect this repo in your Render dashboard
2. Set **Build Command**: `npm install`
3. Set **Start Command**: `npm start`
4. Add environment variable `OPENAI_API_KEY` in the Render dashboard
5. Deploy

### GitHub Pages (static)
Enable Pages on the `main` branch pointing to `/public`. Users enter their API key at runtime in Settings — it is stored in `sessionStorage` only (never committed or persisted).

### Docker
```bash
docker compose up
```

## Using a Local / Alternative Model
In the Settings modal, set the API Endpoint URL to your local vLLM or Ollama endpoint (e.g., `http://localhost:8000/v1`) and enter the model name. The API key field can be set to any non-empty value for local models.

## Features
- 📷 Live camera capture or image upload
- 🤖 AI extracts 8 clothing attributes automatically
- ✏️ Edit any attribute before saving
- 🗂️ Sortable, filterable wardrobe table
- 💾 localStorage persistence (no backend required)
- 📊 Confidence score badge per item
- ⬇️ CSV export
- ⚙️ Configurable API endpoint, model, and key

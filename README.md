<p align="center">
  <img src="./screenshots/blog-header.png" alt="SightLine — Real-Time AI Vision Assistant" width="100%" />
  <br/>
  <em>SightLine — Real-Time AI Vision Assistant for the Visually Impaired, built with Gemini Live API and Google ADK on Google Cloud.</em>
</p>

# SightLine

> Your AI eyes, always ready to help.

A real-time AI vision assistant for the visually impaired, built with the **Gemini Live API** and **Google ADK**. SightLine lets users speak naturally and get instant audio responses about their surroundings — no typing, no waiting.

Built for the [Gemini Live Agent Challenge](https://devpost.com) · #GeminiLiveAgentChallenge

📖 **[Read the full blog post on Medium](https://medium.com/@ashishbeck96)** ← update with published article URL

---

## Demo

[![SightLine Demo](https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg)](https://youtu.be/VIDEO_ID)

> Replace `VIDEO_ID` with your YouTube video ID.

---

## What It Does

- **Navigation** — scene description, obstacle warnings, sign reading
- **Reading** — OCR on documents, labels, menus, medicine bottles
- **Shopping** — product identification, price reading
- **Social** — describe people's expressions and actions (privacy-conscious)

All modes are voice-driven with bidirectional streaming and barge-in support.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Model | `gemini-2.5-flash-native-audio-preview` via Vertex AI |
| Agent Framework | Google ADK + `LiveRequestQueue` |
| Backend | Python on Cloud Run |
| Frontend | Next.js PWA |
| Database | Firestore |
| Storage | Cloud Storage |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Google Cloud project with Vertex AI, Firestore, Cloud Run, Cloud Storage enabled

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # fill in GCP project, region
python main.py
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local  # fill in backend WebSocket URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Cloud Run

```bash
./deploy.sh
```

---

## Architecture

<p align="center">
  <img src="./screenshots/architecture-diagram.png" alt="SightLine Architecture Diagram" width="100%" />
  <br/>
  <em>End-to-end architecture: browser camera + mic stream over WebSocket → Cloud Run (Google ADK + LiveRequestQueue) → Gemini Live API on Vertex AI, with Firestore, Cloud Storage, and Cloud Logging.</em>
</p>

---

## License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Authors

- **Himanshu Sharma** — [GitHub](https://github.com/himanshu64) · [Medium](https://medium.com/@himanshusharma_4140) · [X](https://x.com/himansh68) · [LinkedIn](https://www.linkedin.com/in/himanshu-sharma-0666a5129/)
- **Ashish Beck** — [GitHub](https://github.com/ashishbeck96) · [Medium](https://medium.com/@ashishbeck96) · [X](https://x.com/ashish_asdf) · [LinkedIn](https://www.linkedin.com/in/ashish-beck/) · [GDG](https://gdg.community.dev/u/m692mf/#/about)

---

*Submitted to the Gemini Live Agent Challenge · March 2026*

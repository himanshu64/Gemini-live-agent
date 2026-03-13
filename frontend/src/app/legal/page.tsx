"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Section = "privacy" | "terms" | "hipaa" | "data-retention" | "soc2" | "accessibility";

const LAST_UPDATED = "March 13, 2026";

export default function LegalPage() {
  const [section, setSection] = useState<Section>("privacy");

  const sections: { key: Section; label: string }[] = [
    { key: "privacy", label: "Privacy Policy" },
    { key: "terms", label: "Terms / EULA" },
    { key: "hipaa", label: "HIPAA" },
    { key: "data-retention", label: "Data Retention" },
    { key: "soc2", label: "SOC 2" },
    { key: "accessibility", label: "Accessibility" },
  ];

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <h1 className="font-serif text-2xl italic text-foreground">Legal &amp; Policies</h1>
        <Button variant="ghost" size="sm" className="rounded-full text-xs" render={<Link href="/" />}>
          Home
        </Button>
      </header>

      {/* Section nav */}
      <div className="flex gap-1 px-5 pb-3 overflow-x-auto" role="tablist">
        {sections.map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={section === s.key}
            onClick={() => setSection(s.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              section === s.key ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-5">
        {/* ===================== PRIVACY POLICY ===================== */}
        {section === "privacy" && (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-serif italic text-lg">Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm prose-invert max-w-none">
              <p className="text-xs text-muted-foreground mb-4">Last updated: {LAST_UPDATED}</p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">1. Information We Collect</h3>
              <p className="text-sm text-muted-foreground mb-3">
                SightLine collects the minimum data necessary to provide our real-time AI vision assistance service:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li><strong>Camera frames:</strong> Video frames are streamed in real-time to the Gemini AI model for scene description. Frames are processed transiently and are NOT stored on our servers unless you explicitly request a frame capture.</li>
                <li><strong>Audio data:</strong> Voice input is streamed to Gemini for natural language understanding. Audio is processed in real-time and is NOT recorded or stored.</li>
                <li><strong>Account data:</strong> Firebase authentication UID, email address (if Google sign-in is used), and authentication status.</li>
                <li><strong>Usage data:</strong> Session duration, mode selections, and daily usage time for free tier enforcement.</li>
                <li><strong>Preferences:</strong> User-selected settings (speech rate, verbosity, language, UI preferences).</li>
                <li><strong>Captured frames:</strong> Only when explicitly requested. Stored in Google Cloud Storage with automatic 7-day expiration.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">2. How We Use Your Data</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li>Provide real-time AI-powered scene descriptions and navigation assistance</li>
                <li>Enforce usage limits and manage account tiers</li>
                <li>Remember your preferences across sessions</li>
                <li>Improve service quality and reliability</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">3. Data Sharing</h3>
              <p className="text-sm text-muted-foreground mb-3">
                We do NOT sell, rent, or trade your personal data. Data is shared only with:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li><strong>Google Cloud Platform:</strong> Infrastructure provider (Firestore, Cloud Storage, Cloud Run, Vertex AI)</li>
                <li><strong>Google Gemini API:</strong> AI model provider for real-time vision and audio processing</li>
                <li><strong>Firebase Authentication:</strong> Identity management</li>
              </ul>
              <p className="text-sm text-muted-foreground mb-3">
                All data processing occurs within Google Cloud&apos;s infrastructure with enterprise-grade security.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">4. Your Rights</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li><strong>Access:</strong> View your data via the Dashboard</li>
                <li><strong>Deletion:</strong> Delete captured frames anytime. Request full account deletion by contacting us.</li>
                <li><strong>Portability:</strong> Export your conversation transcripts</li>
                <li><strong>Opt-out:</strong> Use the service anonymously without Google sign-in</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">5. Security</h3>
              <p className="text-sm text-muted-foreground mb-3">
                We implement industry-standard security measures including: encrypted data in transit (TLS 1.3), Firebase authentication tokens, CORS restrictions, rate limiting, CAPTCHA protection (Cloudflare Turnstile), Content Security Policy headers, and per-IP connection limiting.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">6. Contact</h3>
              <p className="text-sm text-muted-foreground">
                For privacy inquiries, contact: privacy@sightline.app
              </p>
            </CardContent>
          </Card>
        )}

        {/* ===================== TERMS / EULA ===================== */}
        {section === "terms" && (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-serif italic text-lg">End User License Agreement (EULA)</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm prose-invert max-w-none">
              <p className="text-xs text-muted-foreground mb-4">Last updated: {LAST_UPDATED}</p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">1. Acceptance of Terms</h3>
              <p className="text-sm text-muted-foreground mb-3">
                By accessing or using SightLine (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">2. Service Description</h3>
              <p className="text-sm text-muted-foreground mb-3">
                SightLine is an AI-powered real-time vision assistance application designed to help visually impaired users understand their surroundings through audio descriptions. The Service uses the Google Gemini AI model to analyze camera feeds and provide spoken scene descriptions.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">3. Important Disclaimers</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li>SightLine is an <strong>assistive tool</strong>, NOT a replacement for professional mobility training, guide dogs, or canes.</li>
                <li>AI descriptions may contain errors, omissions, or inaccuracies. Do NOT rely solely on SightLine for safety-critical navigation decisions.</li>
                <li>The Service requires an active internet connection and may experience latency or interruptions.</li>
                <li>SightLine is NOT a medical device and has NOT been approved by the FDA or any regulatory body.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">4. User Responsibilities</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li>You must be at least 13 years old to use the Service</li>
                <li>You are responsible for maintaining the confidentiality of your account</li>
                <li>You agree not to misuse the Service for any unlawful purpose</li>
                <li>You agree not to circumvent rate limits, authentication, or security measures</li>
                <li>You agree not to use the Service to capture or share images of others without their consent</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">5. Free Tier &amp; Usage Limits</h3>
              <p className="text-sm text-muted-foreground mb-3">
                The free tier provides 30 minutes of daily usage, resetting at midnight UTC. We reserve the right to modify usage limits, features, or pricing with reasonable notice.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">6. Intellectual Property</h3>
              <p className="text-sm text-muted-foreground mb-3">
                SightLine and its original content, features, and functionality are owned by the SightLine team. The Service is open source under the terms of its repository license.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">7. Limitation of Liability</h3>
              <p className="text-sm text-muted-foreground mb-3">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND. IN NO EVENT SHALL THE SIGHTLINE TEAM BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, PERSONAL INJURY, LOSS OF DATA, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">8. Termination</h3>
              <p className="text-sm text-muted-foreground mb-3">
                We may terminate or suspend your access immediately, without prior notice, for any reason including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">9. Governing Law</h3>
              <p className="text-sm text-muted-foreground">
                These Terms shall be governed by the laws of the State of California, United States, without regard to its conflict of law provisions.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ===================== HIPAA ===================== */}
        {section === "hipaa" && (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-serif italic text-lg">HIPAA Compliance Statement</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm prose-invert max-w-none">
              <p className="text-xs text-muted-foreground mb-4">Last updated: {LAST_UPDATED}</p>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 mb-4">
                SightLine is designed as an assistive technology tool and is NOT a medical device. However, we recognize that our users may have disabilities and take data protection seriously.
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">1. Protected Health Information (PHI)</h3>
              <p className="text-sm text-muted-foreground mb-3">
                SightLine does NOT intentionally collect, store, or process Protected Health Information (PHI) as defined by HIPAA. Our service processes visual and audio data for real-time scene description purposes only.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">2. Data Minimization</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li>Video frames are processed transiently — NOT stored unless explicitly captured by the user</li>
                <li>Audio is streamed in real-time and is NOT recorded</li>
                <li>No biometric data is collected or stored</li>
                <li>No health records, diagnoses, or medical information is collected</li>
                <li>User disability status is never stored or inferred from usage patterns</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">3. Technical Safeguards</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li><strong>Encryption in transit:</strong> All data transmitted via TLS 1.3 (HTTPS/WSS)</li>
                <li><strong>Encryption at rest:</strong> Google Cloud default encryption (AES-256) for all stored data</li>
                <li><strong>Access controls:</strong> Firebase authentication, role-based admin access</li>
                <li><strong>Audit logging:</strong> All administrative actions logged in Firestore</li>
                <li><strong>Auto-deletion:</strong> Captured frames automatically deleted after 7 days</li>
                <li><strong>Minimal data retention:</strong> Usage data retained for 90 days, then purged</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">4. Administrative Safeguards</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li>Admin access requires explicit role assignment in Firestore</li>
                <li>User accounts can be disabled by administrators</li>
                <li>Rate limiting and CAPTCHA protection prevent unauthorized access</li>
                <li>Security headers (CSP, HSTS, X-Frame-Options) protect against common attacks</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">5. Breach Notification</h3>
              <p className="text-sm text-muted-foreground mb-3">
                In the event of a data breach that affects user data, we will notify affected users within 72 hours via the email address associated with their account (if available) and post a notice on the application.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">6. Business Associate Agreements</h3>
              <p className="text-sm text-muted-foreground">
                Google Cloud Platform is our primary infrastructure provider and offers BAA coverage under their Google Cloud HIPAA Compliance program. If your organization requires a BAA with SightLine, please contact us at compliance@sightline.app.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ===================== DATA RETENTION ===================== */}
        {section === "data-retention" && (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-serif italic text-lg">Data Retention Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm prose-invert max-w-none">
              <p className="text-xs text-muted-foreground mb-4">Last updated: {LAST_UPDATED}</p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Retention Schedule</h3>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { data: "Video frames (real-time)", retention: "Not stored", note: "Processed transiently via WebSocket" },
                  { data: "Audio data (real-time)", retention: "Not stored", note: "Streamed directly to Gemini API" },
                  { data: "Captured frames", retention: "7 days", note: "Auto-deleted via GCS lifecycle policy" },
                  { data: "Session metadata", retention: "90 days", note: "Session ID, mode, timestamps" },
                  { data: "Usage data", retention: "90 days", note: "Daily usage seconds per user" },
                  { data: "User preferences", retention: "Account lifetime", note: "Deleted on account deletion" },
                  { data: "User account data", retention: "Account lifetime", note: "UID, email, tier, role" },
                  { data: "Gamification data", retention: "Account lifetime", note: "XP, badges, streaks, loyalty points" },
                  { data: "Event logs", retention: "30 days", note: "Session events for debugging" },
                  { data: "Conversation transcripts", retention: "Session only", note: "Client-side only, not stored on server" },
                ].map((row, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-card-foreground">{row.data}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        row.retention === "Not stored" ? "bg-green-500/10 text-green-400" :
                        row.retention.includes("day") ? "bg-amber-500/10 text-amber-400" :
                        "bg-blue-500/10 text-blue-400"
                      }`}>
                        {row.retention}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{row.note}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Deletion Procedures</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li><strong>Captured frames:</strong> Users can delete individual frames via Dashboard. All frames auto-expire after 7 days.</li>
                <li><strong>Account deletion:</strong> Users may request full account deletion. All associated data (preferences, usage, gamification, frames) will be permanently deleted within 30 days.</li>
                <li><strong>Automated cleanup:</strong> GCS lifecycle policies automatically remove expired frames. Firestore TTL policies purge old session and event data.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Legal Holds</h3>
              <p className="text-sm text-muted-foreground">
                Data subject to a legal hold or regulatory investigation will be retained until the hold is released, overriding the standard retention schedule.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ===================== SOC 2 ===================== */}
        {section === "soc2" && (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-serif italic text-lg">SOC 2 Compliance</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm prose-invert max-w-none">
              <p className="text-xs text-muted-foreground mb-4">Last updated: {LAST_UPDATED}</p>

              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300 mb-4">
                SightLine is built on Google Cloud Platform, which maintains SOC 1/2/3 certifications. Our application-level controls are designed to align with SOC 2 Trust Service Criteria.
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Security (CC)</h3>
              <div className="flex flex-col gap-1.5 mb-4">
                {[
                  { control: "CC6.1 - Logical access", status: "Implemented", detail: "Firebase Auth + role-based admin access" },
                  { control: "CC6.2 - Credentials", status: "Implemented", detail: "Firebase ID tokens, API tokens, no plaintext storage" },
                  { control: "CC6.3 - Encryption", status: "Implemented", detail: "TLS 1.3 in transit, AES-256 at rest (GCP default)" },
                  { control: "CC6.6 - System boundaries", status: "Implemented", detail: "CORS restrictions, CSP headers, rate limiting" },
                  { control: "CC6.7 - Data transmission", status: "Implemented", detail: "WSS for WebSocket, HTTPS for API calls" },
                  { control: "CC6.8 - Malicious software", status: "Implemented", detail: "Cloudflare Turnstile CAPTCHA, input validation" },
                  { control: "CC7.2 - Monitoring", status: "Implemented", detail: "Cloud Logging, admin dashboard, error tracking" },
                  { control: "CC7.3 - Incident response", status: "Partial", detail: "Admin user disable, rate limiting auto-response" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-card-foreground">{row.control}</p>
                      <p className="text-[10px] text-muted-foreground">{row.detail}</p>
                    </div>
                    <span className={`text-[10px] font-medium shrink-0 px-2 py-0.5 rounded-full ${
                      row.status === "Implemented" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Availability (A)</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li>Cloud Run with auto-scaling (0-4 backend, 0-2 frontend instances)</li>
                <li>WebSocket keepalive pings every 25 seconds</li>
                <li>Automatic reconnection with exponential backoff (client-side)</li>
                <li>Health check endpoint for uptime monitoring</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Confidentiality (C)</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li>Data minimization: real-time streams not stored</li>
                <li>Captured frames auto-expire after 7 days</li>
                <li>Admin access requires explicit role in Firestore</li>
                <li>Error messages sanitized — no internal details leaked to clients</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Processing Integrity (PI)</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li>Input validation on all API endpoints</li>
                <li>Base64 decode wrapped in try/except to prevent crashes</li>
                <li>Preference value length limits (256 chars max)</li>
                <li>WebSocket message size limits (1MB max)</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Infrastructure Certifications</h3>
              <p className="text-sm text-muted-foreground">
                Google Cloud Platform maintains: SOC 1/2/3, ISO 27001/27017/27018, FedRAMP, HIPAA BAA, PCI DSS, and CSA STAR certifications. Full details at cloud.google.com/security/compliance.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ===================== ACCESSIBILITY ===================== */}
        {section === "accessibility" && (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-serif italic text-lg">Accessibility Statement</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm prose-invert max-w-none">
              <p className="text-xs text-muted-foreground mb-4">Last updated: {LAST_UPDATED}</p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Our Commitment</h3>
              <p className="text-sm text-muted-foreground mb-3">
                SightLine is purpose-built for visually impaired users. Accessibility is not an afterthought — it is our core mission. We strive to conform to WCAG 2.1 Level AA and are continuously improving.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Accessibility Features</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li><strong>Screen reader support:</strong> All interactive elements have ARIA labels and roles</li>
                <li><strong>Voice-first interface:</strong> Full TTS announcements for all state changes, errors, and mode switches</li>
                <li><strong>High contrast:</strong> Dark theme with OKLCH color space for perceptual uniformity</li>
                <li><strong>Large touch targets:</strong> Minimum 48px for all interactive elements</li>
                <li><strong>Keyboard navigation:</strong> Full keyboard support for all controls</li>
                <li><strong>Gesture support:</strong> Swipe left/right for mode switching</li>
                <li><strong>Haptic feedback:</strong> Vibration patterns for connection state changes</li>
                <li><strong>Adjustable speech rate:</strong> 0.5x to 2.0x playback speed</li>
                <li><strong>Configurable verbosity:</strong> Brief, normal, or detailed descriptions</li>
                <li><strong>Font size options:</strong> Small, medium, large, extra-large</li>
                <li><strong>Emergency SOS:</strong> Prominent emergency button with audio confirmation</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Known Limitations</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
                <li>AI descriptions depend on camera quality and lighting conditions</li>
                <li>Real-time streaming requires stable internet connectivity</li>
                <li>Some third-party components may have limited screen reader support</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Feedback</h3>
              <p className="text-sm text-muted-foreground">
                We welcome accessibility feedback. Please report issues at our GitHub repository or contact accessibility@sightline.app.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

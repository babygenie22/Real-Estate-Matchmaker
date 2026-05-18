/**
 * Resend email integration for transactional emails.
 *
 * Requires env var: RESEND_API_KEY, FROM_EMAIL
 * Get a free key at: https://resend.com (100 emails/day free)
 *
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "HomeMatch <noreply@homematch.app>";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[Email skipped – no RESEND_API_KEY] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend API error:", err);
    }
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 40px auto; }
    .header { background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 20px; font-weight: 700; }
    .body { background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px; }
    p { color: #334155; line-height: 1.6; margin: 0 0 16px; }
    .highlight { background: #eff6ff; border-left: 3px solid #2563eb; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>🏠 HomeMatch</h1></div>
    <div class="body">${content}</div>
    <div class="footer">HomeMatch · Real Estate Agent Matching · <a href="#" style="color:#2563eb">Unsubscribe</a></div>
  </div>
</body>
</html>`;
}

export async function sendMatchEmail(to: string, userName: string, agentName: string): Promise<void> {
  await sendEmail(to, `🎉 You matched with ${agentName}!`, baseTemplate(`
    <p>Hi ${userName || "there"},</p>
    <p>Great news — you have a new match!</p>
    <div class="highlight">
      <strong>${agentName}</strong> is now in your matches. Start a conversation and take the next step toward finding your dream home.
    </div>
    <p>Open the HomeMatch app to start chatting.</p>
    <a href="${process.env.APP_URL || "http://localhost:3001"}/matches" class="btn">View Your Matches →</a>
  `));
}

export async function sendBookingConfirmedEmail(
  to: string,
  userName: string,
  agentName: string,
  date: string,
  time: string,
  notes?: string
): Promise<void> {
  await sendEmail(to, `✅ Booking confirmed with ${agentName}`, baseTemplate(`
    <p>Hi ${userName || "there"},</p>
    <p>Your consultation with <strong>${agentName}</strong> has been confirmed!</p>
    <div class="highlight">
      <strong>📅 Date:</strong> ${date}<br>
      <strong>🕐 Time:</strong> ${time}${notes ? `<br><strong>📝 Agent notes:</strong> ${notes}` : ""}
    </div>
    <p>Make sure to have any relevant documents ready. Your agent will reach out to confirm the meeting details.</p>
    <a href="${process.env.APP_URL || "http://localhost:3001"}/profile" class="btn">View Bookings →</a>
  `));
}

export async function sendBookingDeclinedEmail(
  to: string,
  userName: string,
  agentName: string,
  reason?: string
): Promise<void> {
  await sendEmail(to, `Booking update from ${agentName}`, baseTemplate(`
    <p>Hi ${userName || "there"},</p>
    <p>Unfortunately, <strong>${agentName}</strong> is unable to meet at the requested time.</p>
    ${reason ? `<div class="highlight"><strong>Reason:</strong> ${escapeHtml(reason)}</div>` : ""}
    <p>Don't worry — you can request a new time or connect with other matched agents.</p>
    <a href="${process.env.APP_URL || "http://localhost:3001"}/matches" class="btn">Find Another Time →</a>
  `));
}

export async function sendNewMessageEmail(
  to: string,
  userName: string,
  agentName: string,
  messagePreview: string
): Promise<void> {
  await sendEmail(to, `💬 New message from ${agentName}`, baseTemplate(`
    <p>Hi ${userName || "there"},</p>
    <p><strong>${agentName}</strong> sent you a message:</p>
    <div class="highlight">"${escapeHtml(messagePreview)}"</div>
    <a href="${process.env.APP_URL || "http://localhost:3001"}/matches" class="btn">Reply Now →</a>
  `));
}

export async function sendAgentWelcomeEmail(to: string, agentName: string): Promise<void> {
  await sendEmail(to, "Welcome to HomeMatch — your profile is under review", baseTemplate(`
    <p>Hi ${agentName},</p>
    <p>Thanks for joining HomeMatch! Your agent profile has been submitted and is currently under review by our team.</p>
    <div class="highlight">
      <strong>What happens next?</strong><br>
      Our team typically reviews new profiles within 24–48 hours. Once approved, your profile will be visible to home buyers and sellers in your area.
    </div>
    <p>In the meantime, complete your profile to increase your chances of getting matched:</p>
    <ul style="color:#334155; line-height:1.8;">
      <li>Add a professional photo</li>
      <li>Write a compelling bio</li>
      <li>List your service areas</li>
      <li>Add your specialties and languages</li>
    </ul>
    <a href="${process.env.APP_URL || "http://localhost:3001"}/agent-portal" class="btn">Complete Your Profile →</a>
  `));
}

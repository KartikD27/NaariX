import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { contacts, lat, lng, timestamp, locationLabel, customMessage } = await req.json();

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const fromEmail = Deno.env.get("SMTP_FROM") || "narix.alerts@gmail.com";

    if (!smtpHost || !smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM secrets.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No confirmed contacts provided" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const mapsLink = lat && lng
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`
      : "Location unavailable";

    const baseMessage =
      customMessage ||
      "This is an emergency alert from NariX. The sender triggered an SOS and may need help.";

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const contact of contacts) {
      try {
        await transporter.sendMail({
          from: `"NariX Safety Alert" <${fromEmail}>`,
          to: contact.email,
          subject: "URGENT: NariX SOS Emergency Alert",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #f95a47; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Emergency SOS Alert</h1>
              </div>
              <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
                <p style="font-size: 16px; color: #1e293b; margin-bottom: 16px;">${baseMessage}</p>
                <table style="width: 100%; font-size: 14px; color: #475569;">
                  <tr><td style="padding: 8px 0; font-weight: 600;">Sender:</td><td>${contact.name}'s trusted contact list</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: 600;">Time:</td><td>${new Date(timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: 600;">Location:</td><td>${locationLabel}</td></tr>
                </table>
                <div style="margin-top: 20px;">
                  <a href="${mapsLink}" style="display: inline-block; background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Location on Map</a>
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                  This alert was sent automatically by NariX Women's Safety Platform. If this was triggered by mistake, please contact the sender directly.
                </p>
              </div>
            </div>
          `,
          text: `${baseMessage}\n\nTime: ${new Date(timestamp).toLocaleString("en-IN")}\nLocation: ${locationLabel}\nMap: ${mapsLink}`,
        });
        results.push({ email: contact.email, success: true });
      } catch (err) {
        results.push({ email: contact.email, success: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

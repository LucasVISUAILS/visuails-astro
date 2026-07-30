// TEMPORARY — delete this file after we've got the egress IP for the
// Cloudflare support ticket. Not linked from anywhere on the site; only
// reachable by visiting the URL directly. Reveals nothing sensitive (just
// the outbound IP this Cloudflare Pages Function uses to reach the public
// internet), but there's no reason to leave a debug endpoint lying around
// once it's served its purpose.
export async function onRequestGet() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const body = await res.text();
    return new Response(body, { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

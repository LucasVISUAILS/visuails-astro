CLOUDFLARE SUPPORT TICKET
==========================================

Project: Cloudflare Pages — "visuails-astro"
Runtime: Pages Functions (Workers runtime), compatibility_date =
"2026-07-01", compatibility_flags = ["nodejs_compat"]

SUBJECT
--------------------------------------------------------------
Outbound fetch() from Pages Function to api.stripe.com returns blank 400 —
Stripe asking to confirm egress / proxy behavior


BODY
--------------------------------------------------------------
We have a Cloudflare Pages Function that makes an outbound `fetch()` call
from server-side code to Stripe's API (api.stripe.com). Every such request —
including a plain authenticated GET to /v1/balance with no request body at
all — comes back with an HTTP 400 response that is essentially empty: no
Request-Id header, no JSON error body, only connection: close,
content-length: 0, and date.

We've confirmed the exact same request, with the exact same secret key,
works correctly:
- when run from Stripe's own Dashboard Workbench Shell (CLI), and
- when run from a local Node.js environment on our own machine.

It only fails when the identical code runs inside our Cloudflare Pages
Function. We've also ruled out:
- Headers (tested with a minimal Authorization-only header set, and a
  fuller set with User-Agent/Accept/Content-Type — identical failure both
  ways)
- Test vs Live Stripe secret key (identical failure with both)
- GET vs POST / with vs without a request body (identical failure both
  ways)
- A general outbound-networking problem in this Function — the same
  Function successfully reaches a different third-party REST API (Resend,
  for transactional email) via an identical fetch() pattern, with no issue.

Egress IP address used for these outbound requests (confirmed live via a
temporary debug endpoint on the same Pages project, so this is the actual
egress IP right now, not a guess):
IP: 2a06:98c0:3600::103

Exact UTC timestamps of failing requests, all today, all identical blank
400s (connection: close, content-length: 0, date — no Request-Id, no body):
- Thu, 30 Jul 2026 17:57:55 GMT
- Thu, 30 Jul 2026 17:59:51 GMT
- Thu, 30 Jul 2026 18:05:31 GMT

For comparison, the exact same request (same code, same key) succeeded when
run from outside Cloudflare (a local Node environment) at:
- Thu, 30 Jul 2026 18:02:48 GMT — status 200, Stripe request-id
  req_zdKkhUAo8dWX3w

We've opened a parallel support case with Stripe about this (they were not
able to find these requests in their own request logs, which suggests the
requests may not be completing normally, or may be getting intercepted
somewhere in between). Stripe's networking team specifically asked:

  "if you can reach out to Cloudflare to understand if there're any http
  proxies/middleware involved in this egress path on Cloudflare Pages
  Function that might return a 400."

Could you confirm:
1. Whether outbound requests from this Pages Function to api.stripe.com are
   actually leaving Cloudflare's network successfully (i.e. reaching the
   public internet / Stripe's servers), using the IP and timestamp above.
2. Whether there is any proxy, middleware, or compatibility layer in the
   egress path for Pages Functions (particularly with nodejs_compat enabled)
   that could generate or intercept a response like this before it reaches
   the actual destination.

Happy to provide our project name, deployment ID, or additional log
timestamps on request.

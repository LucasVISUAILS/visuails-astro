#!/bin/sh
# Herstart de doorloop-Worker (nep-Mollie/Resend). Eigen bestand, zodat pkill niet de aanroepende shell raakt.
for p in $(pgrep -f 'kladblok/_doorloop-worker.mjs'); do kill $p 2>/dev/null; done
sleep 2
pkill -9 -f workerd 2>/dev/null
cd /home/claude/repo
setsid nohup node kladblok/_doorloop-worker.mjs > /tmp/claude-0/doorloop.log 2>&1 &

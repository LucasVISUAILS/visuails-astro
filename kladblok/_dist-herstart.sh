#!/bin/sh
for p in $(pgrep -f "node kladblok/dist-server"); do kill $p; done
cd /home/claude/repo
setsid nohup node kladblok/dist-server.mjs > /dev/null 2>&1 &

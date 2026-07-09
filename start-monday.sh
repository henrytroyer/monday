#!/usr/bin/env bash
# Start Monday CRM with live data (proxy + dev server).
set -euo pipefail
cd "$(dirname "$0")"
npm run dev:live

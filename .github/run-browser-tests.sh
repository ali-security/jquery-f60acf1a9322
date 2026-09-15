#!/bin/bash
# Runs the QUnit suite (test/index.html) in headless Chrome. The suite needs a
# PHP-capable server for test/data/*.php, and a modern Node for the browser
# driver, so both are set up here; the library itself is still the one built by
# the project's own Node runtime.
set -e

php -S 127.0.0.1:8000 -t . > /tmp/php-server.log 2>&1 &
PHP_PID=$!
trap 'kill "$PHP_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
	if curl -sf -o /dev/null http://127.0.0.1:8000/test/index.html; then
		break
	fi
	sleep 1
done
curl -sf -o /dev/null http://127.0.0.1:8000/test/index.html

RUNNER_DIR=/tmp/qunit-runner
mkdir -p "$RUNNER_DIR"

set +u
. "$NVM_DIR/nvm.sh"
nvm install 18
nvm use 18
set -u

node --version
( cd "$RUNNER_DIR" && npm install --no-save --registry=https://registry.npmjs.org/ puppeteer@23.11.1 )

NODE_PATH="$RUNNER_DIR/node_modules" node .github/run-qunit-chrome.js http://127.0.0.1:8000/test/index.html

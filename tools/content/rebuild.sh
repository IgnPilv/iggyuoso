#!/bin/sh
# Rebuild generated content from a clean checkout of the hand-written files.
set -e
cd "$(dirname "$0")/../.."
git checkout -q -- content/
git clean -fdq -- content/
python3 tools/content/build.py

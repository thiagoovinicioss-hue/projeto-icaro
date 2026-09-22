#!/usr/bin/env bash
cp /tmp/opencode/base_probe.mjs "_base_probe_temp.mjs"
node "_base_probe_temp.mjs" 2>&1
rm -f "_base_probe_temp.mjs"
#!/bin/bash
cd "$(dirname "$0")"
exec ../../node_modules/.bin/next dev --turbopack

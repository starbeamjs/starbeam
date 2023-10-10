#!/bin/bash
set -e

NODE_NO_WARNINGS=1 node --loader @esbuild-kit/esm-loader "$@"

#!/bin/bash
set -e
# NOTE: bun is not required, and we're not pushing it on devs,
#       because we'd want volta to support installing bun automatically,
#       but volta does not.
#
#       Currently, the bun npm package requires a `postinstall` script to run.
#       I don't want to encourage folks rely on postinstall,
#       because it's supply-chain security risk
#
#       https://snyk.io/blog/npm-security-preventing-supply-chain-attacks/
#
#       NOTE for node, we're using @esbuild-kit/esm-loader
#         because both esno and tsx compile to commonjs by default,
#         which adds a tooonnn of overhead.
here=$(dirname "$0")

# Bun is not ready.
FORCE_NODE="true"

if [ "$FORCE_NODE" == "true" ]; then
  NODE_NO_WARNINGS=1 node --loader @esbuild-kit/esm-loader "$@"
	# set -e will exit with proper exit code if the above fails
	exit 0
fi
if [ "$FORCE_BUN" == "true" ]; then
  bun --bun $@
	# set -e will exit with proper exit code if the above fails
	exit 0
fi


if [ "$(type -t bun)" == "file" ]; then
	# The benefit here on one-off commands isn't that great.
	# In testing the noop / noop:execa commands with `time`
	# bun averages about 2-3x faster than node.
	#
	# Where this will become more impactful is during tasks like `lint-staged`,
	# where we are rapidly using the tasks infra to track timings of the lint:fix tasks.
	echo "Using Bun"
  bun --bun $@
else
	echo "Using Node"
  NODE_NO_WARNINGS=1 node --loader @esbuild-kit/esm-loader "$@"
fi

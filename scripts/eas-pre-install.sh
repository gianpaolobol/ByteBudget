#!/usr/bin/env bash
set -euo pipefail
if [[ "${EAS_BUILD_PLATFORM:-}" == "android" ]]; then
  jdk_path=/usr/lib/jvm/java-21-openjdk-amd64
  if [[ ! -x "$jdk_path/bin/java" ]]; then
    sudo apt-get update -qq
    sudo apt-get install -y openjdk-21-jdk-headless
  fi
  "$jdk_path/bin/java" -version
  set-env JAVA_HOME "$jdk_path"
fi

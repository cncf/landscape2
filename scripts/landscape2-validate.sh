#!/bin/bash

TARGET_KIND=$1
TARGET_PATH=$2

function printUsage() {
    echo "USAGE: landscape2-validate.sh <TARGET_KIND> <TARGET_PATH>"
    echo -e "\TARGET_KIND options: data, guide or settings"
    exit 1
}

if [ -z "$TARGET_KIND" ] || [ -z "$TARGET_PATH" ]; then
    printUsage
fi

case $TARGET_KIND in
  data)
    landscape2 validate data --data-file $TARGET_PATH
    ;;
  guide)
    landscape2 validate guide --guide-file $TARGET_PATH
    ;;
  settings)
    landscape2 validate settings --settings-file $TARGET_PATH
    ;;
  *)
    printUsage
    ;;
esac

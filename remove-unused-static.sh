#!/bin/bash
for FILE in $(find src/static -type f); do
    git grep $(basename "$FILE") > /dev/null || rm "$FILE"
done
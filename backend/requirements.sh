#!/bin/bash

REQ_FILE="requirements.txt"
TEMP_FILE=$(mktemp)

# Create requirements.txt if it doesn't exist
touch "$REQ_FILE"

# Get installed packages
pip freeze > "$TEMP_FILE"

# Loop through each package in the current environment
while IFS= read -r package; do
    # Only add package if it's not already in requirements.txt
    if ! grep -Fxq "$package" "$REQ_FILE"; then
        echo "➕ Adding: $package"
        echo "$package" >> "$REQ_FILE"
    fi
done < "$TEMP_FILE"

# Cleanup
rm "$TEMP_FILE"

echo "✅ Done. requirements.txt is updated with missing packages."


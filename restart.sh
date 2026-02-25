#!/bin/bash

# Get the current directory
CWD=$(pwd)

# Find and kill all processes running in the current directory
lsof +D "$CWD" | awk 'NR>1 {print $2}' | xargs -r kill -9

# Start the application
npm start

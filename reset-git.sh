#!/bin/bash

echo "🔄 Resetting Git history..."

# Step 1: Remove .git directory
echo "Step 1: Removing old Git history..."
rm -rf .git

# Step 2: Initialize new repo
echo "Step 2: Initializing new repository..."
git init

# Step 3: Add all files
echo "Step 3: Adding all files..."
git add -A

# Step 4: Create initial commit
echo "Step 4: Creating initial commit..."
git commit -m "Initial commit - FrugalAIGpt v1.0.0"

# Step 5: Add remote
echo "Step 5: Adding remote..."
git remote add origin https://github.com/ashfrnndz21/FrugalAI_Gpt_Beta.git

# Step 6: Force push
echo "Step 6: Force pushing to GitHub..."
git push -f origin master

echo ""
echo "✅ Done! Check your GitHub repository."
echo "🔗 https://github.com/ashfrnndz21/FrugalAI_Gpt_Beta"

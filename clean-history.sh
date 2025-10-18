#!/bin/bash

echo "Creating clean Git history..."

# Remove old git history
rm -rf .git

# Initialize new repository
git init

# Add all files
git add -A

# Create initial commit
git commit -m "Initial commit - FrugalAIGpt v1.0.0

FrugalAIGpt - Cost-Optimized AI Search Engine
- Intelligent query routing with semantic caching
- Multi-source search (Serper.dev, DuckDuckGo)
- Tiered model architecture for 60-70% cost savings
- Real-time metrics and analytics dashboards
- User personalization and preferences
- Modern gradient UI with responsive design"

# Add remote
git remote add origin https://github.com/ashfrnndz21/FrugalAI_Gpt_Beta.git

# Force push to clean history
git push -f origin master

echo "✅ Clean Git history created!"

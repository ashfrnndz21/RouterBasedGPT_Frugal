# 🚀 FrugalAIGpt Startup Guide

This guide explains how to use the automated startup scripts to launch FrugalAIGpt with a single command.

## 📋 Available Startup Scripts

### 1. `startup.sh` - Production (Docker)
Starts the full application stack using Docker Compose.

**Use this when:**
- You want to run the production version
- You want isolated, containerized services
- You're deploying to a server

### 2. `startup-dev.sh` - Development (Local)
Starts the application in development mode without Docker.

**Use this when:**
- You're actively developing features
- You want hot-reload for code changes
- You want faster iteration cycles

## 🎯 Quick Start

### Production Mode (Docker)

```bash
./startup.sh
```

This will:
1. ✅ Check prerequisites (Docker, Docker Compose, Ollama)
2. 🚀 Start Ollama service
3. 📦 Pull required AI models (granite4:micro, qwen3:1.7b)
4. 🐳 Build and start Docker containers
5. ⏳ Wait for services to be ready
6. 🌐 Open the app in your browser
7. 📊 Display service status and useful commands

### Development Mode (Local)

```bash
./startup-dev.sh
```

This will:
1. ✅ Check prerequisites (Node.js 20+, npm, Ollama)
2. 📦 Install dependencies if needed
3. 🚀 Start Ollama service
4. 📦 Pull required AI models
5. 🗄️ Run database migrations
6. 🚀 Start Next.js development server
7. 🌐 App available at http://localhost:3000

## 📦 Prerequisites

### For Production Mode (`startup.sh`)
- **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** - Usually included with Docker Desktop
- **Ollama** (optional) - [Install Ollama](https://ollama.ai)

### For Development Mode (`startup-dev.sh`)
- **Node.js 20+** - [Install Node.js](https://nodejs.org/)
- **npm** - Comes with Node.js
- **Ollama** (optional) - [Install Ollama](https://ollama.ai)

## 🔧 Configuration

Before running the scripts, configure your API keys:

1. **Copy the sample config** (done automatically by scripts):
   ```bash
   cp sample.config.toml config.toml
   ```

2. **Edit `config.toml`** and add your API keys:
   ```toml
   [API_ENDPOINTS]
   SERPER_API_KEY = "your_serper_api_key_here"
   
   [MODELS.OPENAI]
   API_KEY = "your_openai_key_here"  # Optional
   
   [MODELS.OLLAMA]
   API_URL = "http://localhost:11434"  # Default
   ```

3. **Get a Serper API key** (recommended):
   - Visit [serper.dev](https://serper.dev)
   - Sign up for free (2,500 searches/month)
   - Add key to `config.toml`

## 🤖 Ollama Models

The scripts automatically pull these models:
- **granite4:micro** - Fast, efficient model for simple queries (Tier 1)
- **qwen3:1.7b** - Powerful model for complex reasoning (Tier 2)

### Manual Model Management

```bash
# List installed models
ollama list

# Pull a specific model
ollama pull granite4:micro
ollama pull qwen3:1.7b

# Remove a model
ollama rm granite4:micro

# Check Ollama status
curl http://localhost:11434
```

## 🐳 Docker Commands

### View Logs
```bash
docker compose logs -f          # All services
docker compose logs -f app      # Just the app
docker compose logs -f searxng  # Just SearxNG
```

### Stop Services
```bash
docker compose down             # Stop all services
docker compose down -v          # Stop and remove volumes
```

### Restart Services
```bash
docker compose restart          # Restart all
docker compose restart app      # Restart just the app
```

### Rebuild
```bash
docker compose up -d --build    # Rebuild and restart
```

### Check Status
```bash
docker compose ps               # Service status
docker compose top              # Running processes
```

## 🌐 Access Points

Once started, access the application at:

- **Main App**: http://localhost:3000
- **Metrics Dashboard**: http://localhost:3000/metrics
- **Analytics**: http://localhost:3000/analytics
- **Discovery Feed**: http://localhost:3000/discover
- **Settings**: http://localhost:3000/settings

## 🛠️ Troubleshooting

### Script Won't Run
```bash
# Make scripts executable
chmod +x startup.sh
chmod +x startup-dev.sh
```

### Ollama Connection Issues

**macOS/Windows (Docker)**:
```toml
[MODELS.OLLAMA]
API_URL = "http://host.docker.internal:11434"
```

**Linux (Docker)**:
```toml
[MODELS.OLLAMA]
API_URL = "http://<your_private_ip>:11434"
```

**Linux - Expose Ollama**:
```bash
# Edit service file
sudo nano /etc/systemd/system/ollama.service

# Add this line under [Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### Port Already in Use

If port 3000 is already in use:

**Docker**:
Edit `docker-compose.yaml`:
```yaml
ports:
  - 3001:3000  # Change 3001 to any available port
```

**Development**:
```bash
PORT=3001 npm run dev
```

### Models Not Pulling

If models fail to download:
```bash
# Pull manually
ollama pull granite4:micro
ollama pull qwen3:1.7b

# Check available space
df -h

# Check Ollama logs
journalctl -u ollama -f  # Linux
```

### Docker Build Fails

```bash
# Clean Docker cache
docker system prune -a

# Rebuild from scratch
docker compose down -v
docker compose up -d --build
```

### Dependencies Not Installing

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 🔄 Updating the Application

### Docker Mode
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build
```

### Development Mode
```bash
# Pull latest changes
git pull

# Install new dependencies
npm install

# Restart dev server
./startup-dev.sh
```

## 📊 Monitoring

### Check Application Health
```bash
# Test main app
curl http://localhost:3000

# Test Ollama
curl http://localhost:11434

# Test SearxNG (Docker only)
curl http://localhost:4000
```

### View Metrics
Visit http://localhost:3000/metrics to see:
- Cache hit rate
- Query distribution
- Cost savings
- Response times
- Recent queries

## 💡 Tips

1. **First Time Setup**: The first run will take longer as it downloads Docker images and AI models
2. **Model Size**: granite4:micro (~1GB), qwen3:1.7b (~1GB)
3. **RAM Usage**: Ollama keeps models in memory. Adjust `KEEP_ALIVE` in config.toml
4. **API Keys**: Serper.dev is recommended for best search results
5. **Development**: Use `startup-dev.sh` for faster iteration when coding
6. **Production**: Use `startup.sh` for stable, isolated deployment

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker compose logs -f` (Docker) or console output (Dev)
2. Verify prerequisites are installed
3. Check `config.toml` configuration
4. Ensure ports 3000, 4000, 11434 are available
5. Review this troubleshooting guide
6. Open an issue on GitHub with logs and error messages

## 📝 Script Features

Both scripts include:
- ✅ Prerequisite checking
- 🎨 Colored output for easy reading
- ⏳ Service health checks
- 🔄 Automatic retries
- 📊 Status reporting
- 🌐 Browser auto-open
- 💡 Helpful tips and commands

## 🎯 Next Steps

After starting the app:

1. **Configure Settings**: Visit http://localhost:3000/settings
2. **Add API Keys**: Edit `config.toml` for better search results
3. **Try a Query**: Ask a question to test the system
4. **Check Metrics**: Visit http://localhost:3000/metrics
5. **Explore Discovery**: Browse curated news at http://localhost:3000/discover

---

**Happy searching! 🚀**

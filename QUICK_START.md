# ⚡ Quick Start - FrugalAIGpt

Get FrugalAIGpt running in under 2 minutes!

## 🚀 One-Command Startup

### Option 1: Production (Docker) - Recommended
```bash
./startup.sh
```

### Option 2: Development (Local)
```bash
./startup-dev.sh
```

That's it! The script handles everything automatically.

## 📋 What the Script Does

1. ✅ Checks prerequisites
2. 🚀 Starts Ollama
3. 📦 Pulls AI models
4. 🐳 Starts services
5. 🌐 Opens browser

## 🔧 First Time Setup

1. **Clone the repo**:
   ```bash
   git clone https://github.com/ashfrnndz21/FrugalAI_Gpt_Beta.git
   cd FrugalAI_Gpt_Beta
   ```

2. **Run the startup script**:
   ```bash
   ./startup.sh
   ```

3. **Done!** App opens at http://localhost:3000

## 🔑 Optional: Add API Keys

For better search results, add a Serper API key:

1. Get free key at [serper.dev](https://serper.dev) (2,500 searches/month)
2. Edit `config.toml`:
   ```toml
   [API_ENDPOINTS]
   SERPER_API_KEY = "your_key_here"
   ```
3. Restart: `docker compose restart` or `Ctrl+C` and rerun script

## 🛠️ Common Commands

### Docker Mode
```bash
./startup.sh              # Start everything
docker compose logs -f    # View logs
docker compose down       # Stop services
docker compose restart    # Restart services
```

### Development Mode
```bash
./startup-dev.sh          # Start dev server
# Press Ctrl+C to stop
```

## 🌐 Access Points

- **Main App**: http://localhost:3000
- **Metrics**: http://localhost:3000/metrics
- **Analytics**: http://localhost:3000/analytics
- **Discovery**: http://localhost:3000/discover

## 🆘 Troubleshooting

### Script won't run?
```bash
chmod +x startup.sh startup-dev.sh
```

### Port 3000 in use?
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or change port in docker-compose.yaml
```

### Need help?
See [STARTUP_GUIDE.md](STARTUP_GUIDE.md) for detailed troubleshooting.

## 💡 Tips

- **First run**: Takes 5-10 minutes to download models
- **Subsequent runs**: Starts in ~30 seconds
- **RAM**: Models use ~2GB RAM when active
- **Storage**: Models need ~2GB disk space

---

**That's it! You're ready to go! 🎉**

For more details, see [STARTUP_GUIDE.md](STARTUP_GUIDE.md)

---
*Last updated: October 19, 2025*

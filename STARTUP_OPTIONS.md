# 🚀 FrugalAIGpt Startup Options

This document provides an overview of all available methods to start FrugalAIGpt.

## 📋 Available Startup Methods

### 1. Automated Scripts (Recommended) ⭐

The easiest way to start FrugalAIGpt with full automation.

#### Linux/macOS - Production (Docker)
```bash
./startup.sh
```

#### Linux/macOS - Development (Local)
```bash
./startup-dev.sh
```

#### Windows - Production (Docker)
```cmd
startup.bat
```

**Features:**
- ✅ Automatic prerequisite checking
- 🚀 Ollama service management
- 📦 Automatic model pulling
- 🐳 Docker service orchestration
- 🌐 Browser auto-open
- 📊 Status reporting
- 💡 Helpful tips and commands

**Documentation:**
- [QUICK_START.md](QUICK_START.md) - Quick reference
- [STARTUP_GUIDE.md](STARTUP_GUIDE.md) - Detailed guide

---

### 2. Docker Compose (Manual)

Traditional Docker Compose workflow.

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Use when:**
- You want manual control
- You're familiar with Docker
- Scripts don't work for your setup

---

### 3. Development Server (Manual)

Run the Next.js development server directly.

```bash
# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

**Use when:**
- You're actively developing
- You want hot-reload
- You don't need Docker isolation

---

### 4. Production Build (Manual)

Build and run the production version locally.

```bash
# Install dependencies
npm install

# Build the app
npm run build

# Start production server
npm run start
```

**Use when:**
- Testing production builds locally
- Optimizing for performance
- Preparing for deployment

---

## 🎯 Which Method Should I Use?

### For First-Time Users
**Use: `./startup.sh` (Linux/macOS) or `startup.bat` (Windows)**

The automated scripts handle everything and provide helpful guidance.

### For Development
**Use: `./startup-dev.sh`**

Fast iteration with hot-reload and no Docker overhead.

### For Production Deployment
**Use: Docker Compose**

Isolated, containerized services for reliable deployment.

### For Testing
**Use: `npm run dev` or `npm run build && npm run start`**

Quick testing without full setup.

---

## 📊 Comparison Table

| Method | Setup Time | Ease of Use | Hot Reload | Isolation | Best For |
|--------|-----------|-------------|------------|-----------|----------|
| `startup.sh` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | ✅ | First-time users, Production |
| `startup-dev.sh` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ❌ | Active development |
| `startup.bat` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | ✅ | Windows users |
| Docker Compose | ⭐⭐⭐ | ⭐⭐⭐ | ❌ | ✅ | Manual control |
| `npm run dev` | ⭐⭐ | ⭐⭐⭐ | ✅ | ❌ | Quick testing |
| `npm run build` | ⭐⭐ | ⭐⭐ | ❌ | ❌ | Production testing |

---

## 🔧 Prerequisites by Method

### Automated Scripts
**Linux/macOS (`startup.sh`)**:
- Docker & Docker Compose
- Ollama (optional)
- Bash shell

**Linux/macOS (`startup-dev.sh`)**:
- Node.js 20+
- npm
- Ollama (optional)
- Bash shell

**Windows (`startup.bat`)**:
- Docker Desktop
- Windows Command Prompt

### Manual Methods
**Docker Compose**:
- Docker & Docker Compose
- config.toml file

**Development/Production**:
- Node.js 20+
- npm
- config.toml file

---

## 🚀 Quick Command Reference

### Automated Scripts
```bash
# Production (Docker)
./startup.sh                    # Linux/macOS
startup.bat                     # Windows

# Development (Local)
./startup-dev.sh                # Linux/macOS

# Make executable (if needed)
chmod +x startup.sh startup-dev.sh
```

### Docker Compose
```bash
docker compose up -d            # Start
docker compose down             # Stop
docker compose restart          # Restart
docker compose logs -f          # View logs
docker compose ps               # Status
docker compose up -d --build    # Rebuild
```

### NPM Scripts
```bash
npm install                     # Install dependencies
npm run dev                     # Development server
npm run build                   # Build for production
npm run start                   # Start production server
npm run db:migrate              # Run migrations
npm run lint                    # Lint code
```

### Ollama Commands
```bash
ollama list                     # List models
ollama pull granite4:micro      # Pull model
ollama pull qwen3:1.7b          # Pull model
ollama rm <model>               # Remove model
ollama serve                    # Start Ollama server
```

---

## 🌐 Access Points (All Methods)

Once started, access the application at:

- **Main App**: http://localhost:3000
- **Metrics Dashboard**: http://localhost:3000/metrics
- **Analytics**: http://localhost:3000/analytics
- **Discovery Feed**: http://localhost:3000/discover
- **Settings**: http://localhost:3000/settings

---

## 🛠️ Troubleshooting

### Scripts Won't Run
```bash
# Make executable
chmod +x startup.sh startup-dev.sh

# Check shell
echo $SHELL  # Should be /bin/bash or /bin/zsh
```

### Docker Issues
```bash
# Check Docker is running
docker ps

# Restart Docker Desktop
# macOS: Restart from menu bar
# Linux: sudo systemctl restart docker
```

### Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000          # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>          # macOS/Linux
taskkill /PID <PID> /F # Windows
```

### Ollama Not Starting
```bash
# Check if running
curl http://localhost:11434

# Start manually
ollama serve           # Linux/macOS
# Or open Ollama app   # macOS
```

---

## 💡 Tips

1. **First Run**: Takes 5-10 minutes to download models and images
2. **Subsequent Runs**: Starts in ~30 seconds
3. **Development**: Use `startup-dev.sh` for faster iteration
4. **Production**: Use `startup.sh` for stable deployment
5. **Windows**: Use `startup.bat` for automated setup
6. **Manual Control**: Use Docker Compose commands directly
7. **Testing**: Use `npm run dev` for quick tests

---

## 📚 Additional Resources

- [QUICK_START.md](QUICK_START.md) - Get started in 2 minutes
- [STARTUP_GUIDE.md](STARTUP_GUIDE.md) - Detailed startup guide
- [README.md](README.md) - Full documentation
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines

---

## 🆘 Getting Help

If you encounter issues:

1. Check this document for your startup method
2. Review [STARTUP_GUIDE.md](STARTUP_GUIDE.md) for troubleshooting
3. Check logs: `docker compose logs -f` or console output
4. Verify prerequisites are installed
5. Ensure ports are available
6. Open an issue on GitHub with details

---

**Choose the method that works best for you and get started! 🚀**

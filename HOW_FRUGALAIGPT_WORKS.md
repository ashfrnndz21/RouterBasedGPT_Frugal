# How FrugalAIGpt Chat Page Works

## 🔄 Complete User Flow

### 1. Page Load
```
User visits localhost:3000
    ↓
ChatProvider initializes
    ↓
Checks localStorage for model config
    ↓
Fetches available models from /api/models
    ↓
Shows EmptyChat (landing page with logo)
```

### 2. User Sends Query
```
User types "Tell me about Llama 4"
    ↓
sendMessage() function called
    ↓
POST /api/chat with query + history + settings
    ↓
Backend processes query
    ↓
Streams response back
```

### 3. Backend Processing
```
/api/chat receives request
    ↓
Orchestration Service routes query
    ↓
┌─────────────────────────────────┐
│ Frugal Router classifies query  │
│ - Simple greeting? → Canned     │
│ - FAQ? → Check cache            │
│ - Complex? → Tier 2 model       │
│ - Normal? → Tier 1 model        │
└─────────────────────────────────┘
    ↓
Semantic Cache check (if applicable)
    ↓
If cache miss → RAG Pipeline:
  1. Web search (Serper)
  2. Retrieve top sources
  3. Generate answer with LLM
  4. Stream response token-by-token
    ↓
Cache the result for future queries
```

### 4. Response Streaming
```
Backend sends JSON events:
    ↓
{ type: 'sources', data: [...] }
    ↓
{ type: 'message', data: 'token' }
    ↓
{ type: 'message', data: 'token' }
    ↓
...
    ↓
{ type: 'messageEnd' }
```

### 5. Frontend Rendering
```
MessageHandler receives events
    ↓
'sources' → Add source cards
    ↓
'message' → Append tokens to answer
    ↓
'messageEnd' → Show suggestions
    ↓
Auto-click "Search images" (if enabled)
```

## 🎨 UI Components Breakdown

### Landing Page (EmptyChat.tsx)
```
┌─────────────────────────────────┐
│      [FrugalAIGpt Logo - 96px]      │
│                                 │
│         FrugalAIGpt                 │
│  AI-Powered Search & Intelligence│
│                                 │
│  [Search Input Box]             │
│  [Focus] [Attach] [Speed ▼] [→]│
│                                 │
│  [Weather Widget] [News Widget] │
└─────────────────────────────────┘
```

### Chat Interface (Chat.tsx + MessageBox.tsx)
```
┌─────────────────────────────────────────────────────────┐
│ [Navbar with chat title]                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tell me about Llama 4                                  │
│                                                         │
│  📚 Sources                    │  🖼️ Search images    │
│  [Source 1] [Source 2] [Source 3]│  [+ button]         │
│                                 │                       │
│  💬 Answer                      │  🎥 Search videos    │
│  Llama 4 is a large language... │  [+ button]         │
│  model <citation>1</citation>... │                       │
│                                 │                       │
│  [Rewrite] [Copy] [Speak]      │                       │
│                                 │                       │
│  🔗 Related                     │                       │
│  - What are the key features?   │                       │
│  - How does it compare to...    │                       │
│                                 │                       │
├─────────────────────────────────┴───────────────────────┤
│  [Message Input - Fixed at bottom]                      │
└─────────────────────────────────────────────────────────┘
```

## ⚙️ Configuration System

### Current Configuration (localStorage)

The app stores user preferences in browser localStorage:

```typescript
// Model Selection
localStorage.getItem('chatModel')           // e.g., "granite4:micro"
localStorage.getItem('chatModelProvider')   // e.g., "ollama"
localStorage.getItem('embeddingModel')      // e.g., "nomic-embed-text"
localStorage.getItem('embeddingModelProvider') // e.g., "ollama"

// Feature Toggles
localStorage.getItem('autoImageSearch')     // "true" or "false"
localStorage.getItem('autoVideoSearch')     // "true" or "false"
localStorage.getItem('systemInstructions')  // Custom prompt instructions

// Theme
localStorage.getItem('theme')               // "dark" or "light"
```

### Settings Page

Users can configure these via `/settings`:
- **Chat Model**: Select which LLM to use
- **Embedding Model**: Select embedding model
- **Focus Mode**: webSearch, academicSearch, writingAssistant, etc.
- **Optimization Mode**: speed or balanced
- **Auto Image Search**: Toggle automatic image loading
- **Auto Video Search**: Toggle automatic video loading
- **System Instructions**: Custom prompt additions

## 🔧 Making It Configurable for End Users

### Option 1: Settings UI (Already Exists)

The app already has a `/settings` page where users can configure:

**To enhance it:**

1. **Add More Toggles**:
```typescript
// In settings page
<Toggle 
  label="Auto-load images" 
  value={autoImageSearch}
  onChange={(val) => localStorage.setItem('autoImageSearch', val)}
/>

<Toggle 
  label="Show source thumbnails" 
  value={showSourceThumbnails}
  onChange={(val) => localStorage.setItem('showSourceThumbnails', val)}
/>

<Toggle 
  label="Enable semantic cache" 
  value={enableCache}
  onChange={(val) => localStorage.setItem('enableCache', val)}
/>
```

2. **Add Model Preferences**:
```typescript
<Select 
  label="Preferred Model Tier"
  options={['Always Fast (Tier 1)', 'Auto (Smart Routing)', 'Always Deep (Tier 2)']}
  value={modelPreference}
  onChange={(val) => localStorage.setItem('modelPreference', val)}
/>
```

3. **Add Citation Style**:
```typescript
<Select 
  label="Citation Style"
  options={['Inline [1]', 'Superscript¹', 'Footnotes', 'None']}
  value={citationStyle}
  onChange={(val) => localStorage.setItem('citationStyle', val)}
/>
```

### Option 2: In-Chat Quick Settings

Add a settings panel in the chat interface:

```typescript
// In MessageInput.tsx or Navbar.tsx
<Popover>
  <PopoverTrigger>
    <Settings size={20} />
  </PopoverTrigger>
  <PopoverContent>
    <div className="space-y-3">
      <Toggle label="Auto-load images" />
      <Toggle label="Show citations" />
      <Select label="Response length" options={['Concise', 'Detailed', 'Comprehensive']} />
      <Select label="Model tier" options={['Fast', 'Auto', 'Deep']} />
    </div>
  </PopoverContent>
</Popover>
```

### Option 3: Per-Query Configuration

Add options to the message input:

```typescript
// In EmptyChatMessageInput.tsx
<div className="flex items-center gap-2">
  <Select value={focusMode} onChange={setFocusMode}>
    <option value="webSearch">Web Search</option>
    <option value="academicSearch">Academic</option>
    <option value="writingAssistant">Writing</option>
  </Select>
  
  <Select value={optimizationMode} onChange={setOptimizationMode}>
    <option value="speed">Fast</option>
    <option value="balanced">Balanced</option>
  </Select>
  
  <Button>Send</Button>
</div>
```

## 📝 Configuration Options to Add

### 1. Response Preferences
```typescript
interface ResponsePreferences {
  length: 'concise' | 'detailed' | 'comprehensive';
  tone: 'professional' | 'casual' | 'technical';
  citationStyle: 'inline' | 'superscript' | 'footnotes' | 'none';
  includeExamples: boolean;
  includeDefinitions: boolean;
}
```

### 2. Search Preferences
```typescript
interface SearchPreferences {
  autoImageSearch: boolean;
  autoVideoSearch: boolean;
  maxSources: number; // 3, 5, 10
  sourceTypes: ('web' | 'academic' | 'news' | 'reddit')[];
  searchDepth: 'quick' | 'thorough';
}
```

### 3. Model Preferences
```typescript
interface ModelPreferences {
  tierPreference: 'always-tier1' | 'auto' | 'always-tier2';
  enableCache: boolean;
  cacheThreshold: number; // 0.90 - 0.99
  maxTokens: number; // 1024, 2048, 4096
  temperature: number; // 0.1 - 1.0
}
```

### 4. UI Preferences
```typescript
interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  showSourceThumbnails: boolean;
  showMetrics: boolean; // Cache hits, model tier, latency
  compactMode: boolean;
  animationsEnabled: boolean;
}
```

## 🛠️ Implementation Example

### Create a Settings Context

```typescript
// src/lib/hooks/useSettings.tsx
interface Settings {
  response: ResponsePreferences;
  search: SearchPreferences;
  model: ModelPreferences;
  ui: UIPreferences;
}

const DEFAULT_SETTINGS: Settings = {
  response: {
    length: 'detailed',
    tone: 'professional',
    citationStyle: 'inline',
    includeExamples: true,
    includeDefinitions: true,
  },
  search: {
    autoImageSearch: true,
    autoVideoSearch: false,
    maxSources: 5,
    sourceTypes: ['web', 'news'],
    searchDepth: 'thorough',
  },
  model: {
    tierPreference: 'auto',
    enableCache: true,
    cacheThreshold: 0.95,
    maxTokens: 2048,
    temperature: 0.7,
  },
  ui: {
    theme: 'dark',
    fontSize: 'medium',
    showSourceThumbnails: true,
    showMetrics: true,
    compactMode: false,
    animationsEnabled: true,
  },
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('frugalaigpt-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  
  const updateSettings = (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('frugalaigpt-settings', JSON.stringify(updated));
  };
  
  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
```

### Use Settings in Components

```typescript
// In MessageBox.tsx
const { settings } = useSettings();

// Conditionally show images based on settings
{settings.search.autoImageSearch && (
  <SearchImages query={query} />
)}

// Apply citation style
{settings.response.citationStyle === 'inline' && (
  <Citation href={url}>{number}</Citation>
)}

// Show metrics if enabled
{settings.ui.showMetrics && (
  <div className="text-xs text-gray-500">
    Cache hit • Tier 1 • 234ms
  </div>
)}
```

### Enhanced Settings Page

```typescript
// src/app/settings/page.tsx
const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold frugalaigpt-gradient-text">Settings</h1>
      
      {/* Response Settings */}
      <Section title="Response Preferences">
        <Select 
          label="Response Length"
          value={settings.response.length}
          onChange={(val) => updateSettings({ 
            response: { ...settings.response, length: val }
          })}
          options={[
            { value: 'concise', label: 'Concise (faster, cheaper)' },
            { value: 'detailed', label: 'Detailed (balanced)' },
            { value: 'comprehensive', label: 'Comprehensive (thorough)' },
          ]}
        />
        
        <Select 
          label="Citation Style"
          value={settings.response.citationStyle}
          onChange={(val) => updateSettings({ 
            response: { ...settings.response, citationStyle: val }
          })}
          options={[
            { value: 'inline', label: 'Inline [1]' },
            { value: 'superscript', label: 'Superscript¹' },
            { value: 'footnotes', label: 'Footnotes' },
            { value: 'none', label: 'No citations' },
          ]}
        />
      </Section>
      
      {/* Search Settings */}
      <Section title="Search Preferences">
        <Toggle 
          label="Auto-load images"
          description="Automatically fetch images for each query"
          value={settings.search.autoImageSearch}
          onChange={(val) => updateSettings({ 
            search: { ...settings.search, autoImageSearch: val }
          })}
        />
        
        <Toggle 
          label="Auto-load videos"
          description="Automatically fetch videos for each query"
          value={settings.search.autoVideoSearch}
          onChange={(val) => updateSettings({ 
            search: { ...settings.search, autoVideoSearch: val }
          })}
        />
        
        <Slider 
          label="Max Sources"
          description="Number of sources to retrieve (more = slower but thorough)"
          min={3}
          max={10}
          value={settings.search.maxSources}
          onChange={(val) => updateSettings({ 
            search: { ...settings.search, maxSources: val }
          })}
        />
      </Section>
      
      {/* Model Settings */}
      <Section title="AI Model Preferences">
        <Select 
          label="Model Tier Preference"
          value={settings.model.tierPreference}
          onChange={(val) => updateSettings({ 
            model: { ...settings.model, tierPreference: val }
          })}
          options={[
            { value: 'always-tier1', label: 'Always Fast (Tier 1) - Cheapest' },
            { value: 'auto', label: 'Auto (Smart Routing) - Recommended' },
            { value: 'always-tier2', label: 'Always Deep (Tier 2) - Best Quality' },
          ]}
        />
        
        <Toggle 
          label="Enable Semantic Cache"
          description="Cache similar queries for instant responses (saves 60-70% cost)"
          value={settings.model.enableCache}
          onChange={(val) => updateSettings({ 
            model: { ...settings.model, enableCache: val }
          })}
        />
        
        <Slider 
          label="Cache Similarity Threshold"
          description="How similar queries must be to use cache (higher = stricter)"
          min={0.90}
          max={0.99}
          step={0.01}
          value={settings.model.cacheThreshold}
          onChange={(val) => updateSettings({ 
            model: { ...settings.model, cacheThreshold: val }
          })}
        />
      </Section>
      
      {/* UI Settings */}
      <Section title="Interface Preferences">
        <Toggle 
          label="Show Performance Metrics"
          description="Display cache hits, model tier, and response time"
          value={settings.ui.showMetrics}
          onChange={(val) => updateSettings({ 
            ui: { ...settings.ui, showMetrics: val }
          })}
        />
        
        <Toggle 
          label="Show Source Thumbnails"
          description="Display preview images for source links"
          value={settings.ui.showSourceThumbnails}
          onChange={(val) => updateSettings({ 
            ui: { ...settings.ui, showSourceThumbnails: val }
          })}
        />
        
        <Select 
          label="Font Size"
          value={settings.ui.fontSize}
          onChange={(val) => updateSettings({ 
            ui: { ...settings.ui, fontSize: val }
          })}
          options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ]}
        />
      </Section>
    </div>
  );
};
```

## 🔌 How to Use Settings in Backend

### Pass Settings to API

```typescript
// In useChat.tsx sendMessage()
const res = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    content: message,
    chatId: chatId,
    focusMode: focusMode,
    optimizationMode: optimizationMode,
    // ADD: User preferences
    preferences: {
      responseLength: settings.response.length,
      maxSources: settings.search.maxSources,
      tierPreference: settings.model.tierPreference,
      enableCache: settings.model.enableCache,
      cacheThreshold: settings.model.cacheThreshold,
    },
    // ... rest
  }),
});
```

### Use Settings in Backend

```typescript
// In /api/chat/route.ts or orchestration service
const preferences = body.preferences || DEFAULT_PREFERENCES;

// Apply tier preference
let modelTier = 'tier1';
if (preferences.tierPreference === 'always-tier2') {
  modelTier = 'tier2';
} else if (preferences.tierPreference === 'auto') {
  // Use frugal router decision
  modelTier = routingDecision.path === 'rag-tier2' ? 'tier2' : 'tier1';
}

// Apply cache settings
if (preferences.enableCache) {
  const cached = await semanticCache.get(
    query, 
    userId, 
    preferences.cacheThreshold
  );
  if (cached) return cached;
}

// Apply max sources
const sources = await retrieveSources(query, preferences.maxSources);

// Apply response length
const maxTokens = {
  'concise': 512,
  'detailed': 2048,
  'comprehensive': 4096,
}[preferences.responseLength];
```

## 🎯 Key Configuration Points

### 1. Focus Mode (Already Configurable)
- **webSearch**: General web search
- **academicSearch**: Scholarly sources
- **writingAssistant**: No search, just writing help
- **wolframAlphaSearch**: Math and calculations
- **youtubeSearch**: YouTube videos
- **redditSearch**: Reddit discussions

**How to change**: Dropdown in message input or settings page

### 2. Optimization Mode (Already Configurable)
- **speed**: Faster responses, fewer sources
- **balanced**: Balance between speed and quality

**How to change**: Dropdown in message input

### 3. Auto Image/Video Search (Already Configurable)
- **autoImageSearch**: Auto-click "Search images" after each response
- **autoVideoSearch**: Auto-click "Search videos" after each response

**How to change**: Settings page toggles

### 4. Model Selection (Already Configurable)
- **chatModel**: Which LLM to use (granite4:micro, qwen3:1.7b, etc.)
- **chatModelProvider**: Which provider (ollama, openai, etc.)

**How to change**: Settings page dropdowns

## 🚀 Quick Implementation Guide

### Step 1: Create Settings Context
```bash
# Create new file
touch src/lib/hooks/useSettings.tsx
```

### Step 2: Define Settings Interface
```typescript
// Add all preference types
interface Settings { ... }
```

### Step 3: Create Settings Provider
```typescript
// Wrap app in SettingsProvider
<SettingsProvider>
  <ChatProvider>
    <ChatWindow />
  </ChatProvider>
</SettingsProvider>
```

### Step 4: Build Settings UI
```typescript
// Create enhanced settings page with all options
// Use Tailwind components for toggles, selects, sliders
```

### Step 5: Apply Settings
```typescript
// Read settings in components
const { settings } = useSettings();

// Pass to backend
fetch('/api/chat', { body: { ...data, preferences: settings } })

// Use in backend
if (preferences.enableCache) { ... }
```

## 📊 Current Configurable Features

### ✅ Already Configurable:
1. Chat model selection
2. Embedding model selection
3. Focus mode (6 modes)
4. Optimization mode (speed/balanced)
5. Auto image search (on/off)
6. Auto video search (on/off)
7. Theme (dark/light)
8. System instructions (custom prompts)

### ❌ Not Yet Configurable:
1. Response length/detail level
2. Citation style
3. Max sources count
4. Cache threshold
5. Model tier preference
6. Source thumbnail display
7. Performance metrics display
8. Font size
9. Compact mode

## 💡 Recommended Configuration UI

Create a tabbed settings page:

```
┌─────────────────────────────────────┐
│ Settings                            │
├─────────────────────────────────────┤
│ [General] [Models] [Search] [UI]   │
├─────────────────────────────────────┤
│                                     │
│ General                             │
│ ├─ Response Length: [Detailed ▼]   │
│ ├─ Citation Style: [Inline ▼]      │
│ └─ Tone: [Professional ▼]          │
│                                     │
│ Models                              │
│ ├─ Chat Model: [granite4:micro ▼]  │
│ ├─ Tier Preference: [Auto ▼]       │
│ ├─ Enable Cache: [✓]               │
│ └─ Cache Threshold: [0.95] ━━━━○   │
│                                     │
│ Search                              │
│ ├─ Auto Images: [✓]                │
│ ├─ Auto Videos: [ ]                │
│ ├─ Max Sources: [5] ━━━○━━━        │
│ └─ Search Depth: [Thorough ▼]      │
│                                     │
│ Interface                           │
│ ├─ Theme: [Dark ▼]                 │
│ ├─ Font Size: [Medium ▼]           │
│ ├─ Show Metrics: [✓]               │
│ └─ Animations: [✓]                 │
│                                     │
│         [Reset to Defaults]         │
│              [Save]                 │
└─────────────────────────────────────┘
```

This gives users full control over their FrugalAIGpt experience while maintaining sensible defaults!

---
*Last updated: October 19, 2025*

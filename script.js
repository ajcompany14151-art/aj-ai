// Global state management
const defaultSettings = {
    darkMode: false,
    typingAnimation: true,
    fontSize: 'medium',
    typingSpeed: 'medium',
    viewMode: 'normal',
    autoSave: true
};

let state = {
    chats: [],
    selectedChatId: null,
    currentModel: 'grok',
    chatStatus: 'idle',
    abortController: null,
    settings: { ...defaultSettings },
    viewMode: 'normal',
    conversationData: {
        topics: [],
        keyPoints: [],
        messageCount: 0,
        wordCount: 0,
        currentTopic: 'No active conversation'
    }
};

const TYPING_SPEEDS = {
    slow: 40,
    medium: 20,
    fast: 5
};

const MODEL_CONFIGS = {
    grok: {
        name: 'AJ-Fast',
        apiModel: 'llama3-8b-8192',
        color: 'from-blue-500 to-purple-600',
        icon: 'AJ',
        endpoint: '/api/chat'
    },
    gemini: {
        name: 'AJ-Creative',
        apiModel: 'gemini-1.5-flash',
        color: 'from-purple-500 to-pink-600',
        icon: 'AJ',
        endpoint: '/api/chat'
    },
    zai: {
        name: 'AJ-ZAI',
        apiModel: 'z-ai-sdk',
        color: 'from-green-500 to-teal-600',
        icon: 'Z',
        endpoint: '/api/chat'
    }
};

// DOM elements
const D = {
    html: document.documentElement,
    chatContainer: document.getElementById('chatContainer'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    chatList: document.getElementById('chatList'),
    settingsModal: document.getElementById('settingsModal'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    mainContent: document.getElementById('mainContent'),
    advancedView: document.getElementById('advancedView'),
    currentTopic: document.getElementById('currentTopic'),
    keyPoints: document.getElementById('keyPoints'),
    relatedTopics: document.getElementById('relatedTopics'),
    messageCount: document.getElementById('messageCount'),
    wordCount: document.getElementById('wordCount'),
    topicCount: document.getElementById('topicCount'),
    conversationFlow: document.getElementById('conversationFlow'),
    aiInsights: document.getElementById('aiInsights'),
    topicsAnalysis: document.getElementById('topicsAnalysis')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    loadState();
    applySettings();
    initializeEventListeners();
    selectChat(state.selectedChatId || state.chats[0]?.id || createNewChat(false));
    updateAdvancedView();
});

// Event listeners initialization
function initializeEventListeners() {
    // Mobile menu
    document.getElementById('mobileMenuBtn').addEventListener('click', toggleSidebar);
    
    // Chat controls
    document.getElementById('newChatBtn').addEventListener('click', () => createNewChat(true));
    document.getElementById('clearBtn').addEventListener('click', clearChat);
    document.getElementById('exportBtn').addEventListener('click', exportChat);
    document.getElementById('viewToggleBtn').addEventListener('click', toggleViewMode);
    document.getElementById('closeAdvancedBtn').addEventListener('click', toggleViewMode);
    
    // Settings
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
    document.getElementById('closeSettingsBtn').addEventListener('click', () => D.settingsModal.classList.add('hidden'));
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
    
    // Input
    D.messageInput.addEventListener('keydown', handleInputKeydown);
    D.messageInput.addEventListener('input', () => {
        D.messageInput.style.height = 'auto';
        D.messageInput.style.height = `${D.messageInput.scrollHeight}px`;
    });
    D.messageInput.addEventListener('focus', () => D.chatContainer.classList.add('keyboard-open'));
    D.messageInput.addEventListener('blur', () => D.chatContainer.classList.remove('keyboard-open'));
    D.sendBtn.addEventListener('click', sendMessage);
    
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => renderChatList(e.target.value.toLowerCase()));
    
    // Example prompts
    document.querySelectorAll('.example-prompt').forEach(el => {
        el.addEventListener('click', (e) => {
            D.messageInput.value = e.currentTarget.dataset.prompt;
            sendMessage();
        });
    });
    
    // Settings controls
    document.querySelectorAll('.fontSizeBtn').forEach(el => {
        el.addEventListener('click', (e) => setActiveButton(e.currentTarget, '.fontSizeBtn'));
    });
    
    document.querySelectorAll('.typingSpeedBtn').forEach(el => {
        el.addEventListener('click', (e) => setActiveButton(e.currentTarget, '.typingSpeedBtn'));
    });
    
    // Model selection
    document.querySelectorAll('.model-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const model = e.currentTarget.dataset.model;
            selectModelInSettings(model);
        });
    });
    
    // View mode selection
    document.querySelectorAll('.view-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            selectViewInSettings(view);
        });
    });
    
    // Advanced controls
    document.getElementById('insightsBtn')?.addEventListener('click', generateInsights);
    document.getElementById('visualizeBtn')?.addEventListener('click', updateVisualization);
    document.getElementById('exportAdvancedBtn')?.addEventListener('click', exportAdvancedData);
    
    // Attach and voice buttons (placeholder functionality)
    document.getElementById('attachBtn').addEventListener('click', () => showToast('File attachments coming soon!', 'info'));
    document.getElementById('voiceBtn').addEventListener('click', () => showToast('Voice input coming soon!', 'info'));
}

// Chat management functions
async function sendMessage() {
    const messageText = D.messageInput.value.trim();
    if (!messageText || !state.selectedChatId || state.chatStatus !== 'idle') return;
    
    const chat = state.chats.find(c => c.id === state.selectedChatId);
    if (!chat) return;
    
    setChatStatus('waiting');
    
    // Add user message
    chat.messages.push({
        id: crypto.randomUUID(),
        sender: 'user',
        text: messageText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    
    // Add AI message placeholder
    const aiMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        aiType: state.currentModel,
        isStreaming: true
    };
    
    chat.messages.push(aiMessage);
    
    // Update chat title if it's the first message
    if (chat.messages.length === 2 && chat.title === 'New Conversation') {
        chat.title = messageText.substring(0, 30) + (messageText.length > 30 ? '...' : '');
    }
    
    // Clear input and update UI
    D.messageInput.value = '';
    D.messageInput.style.height = 'auto';
    renderChatList();
    renderMessages();
    saveState();
    updateConversationData();
    
    // Send to API
    state.abortController = new AbortController();
    
    try {
        const response = await fetch(MODEL_CONFIGS[state.currentModel].endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ai: state.currentModel,
                messages: chat.messages.slice(0, -1).map(m => ({
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    content: m.text
                }))
            }),
            signal: state.abortController.signal
        });
        
        console.log('API Response Status:', response.status);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        setChatStatus('streaming');
        const data = await response.json();
        console.log('API Response:', data);
        
        // Handle the response from our API
        if (data.response) {
            aiMessage.text = data.response;
            aiMessage.isStreaming = false;
            renderMessages();
            updateConversationData();
            if (state.viewMode === 'advanced') {
                updateAdvancedView();
            }
        } else {
            throw new Error('No response from API');
        }
        
    } catch (error) {
        console.error('Error in sendMessage:', error);
        if (error.name === 'AbortError') {
            aiMessage.text += "\n\n*Generation stopped by user.*";
        } else {
            aiMessage.text = `Sorry, I encountered an error: ${error.message}`;
            aiMessage.isError = true;
        }
    } finally {
        aiMessage.isStreaming = false;
        setChatStatus('idle');
        renderMessages();
        saveState();
    }
}

function renderMessages() {
    const chat = state.chats.find(c => c.id === state.selectedChatId);
    if (!chat || chat.messages.length === 0) {
        D.welcomeScreen.classList.remove('hidden');
        D.messagesContainer.classList.add('hidden');
        return;
    }
    
    D.welcomeScreen.classList.add('hidden');
    D.messagesContainer.classList.remove('hidden');
    
    D.messagesContainer.innerHTML = chat.messages.map((msg, index) => {
        const config = MODEL_CONFIGS[msg.aiType || 'grok'];
        const senderIcon = msg.sender === 'user' ?
            `<div class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex-shrink-0 flex items-center justify-center font-bold">U</div>` :
            `<div class="w-8 h-8 rounded-full bg-gradient-to-r ${config.color} flex-shrink-0 flex items-center justify-center text-white font-bold">${config.icon}</div>`;
        
        let content = '';
        if (msg.isStreaming) {
            content = `<div class="thinking-indicator"><div class="thinking-dot"></div><div class="thinking-dot"></div><div class="thinking-dot"></div></div>`;
        } else {
            content = processMessageText(msg.text);
        }
        
        const messageBubble = `
            <div class="message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'} ${msg.isError ? 'error-message' : ''}">
                <div class="message-content">${content}</div>
                ${!msg.isStreaming ? `<div class="flex items-center justify-between mt-2"><span class="text-xs opacity-70">${msg.timestamp}</span><div class="flex gap-1">${msg.sender === 'ai' ? `<button onclick="regenerateResponse(${index})" class="p-1 hover:bg-accent rounded transition-colors" title="Regenerate"><i data-lucide="refresh-cw" class="h-3 w-3"></i></button>` : ''}<button onclick="copyMessage('${escapeHtml(msg.text)}')" class="p-1 hover:bg-accent rounded transition-colors" title="Copy"><i data-lucide="copy" class="h-3 w-3"></i></button></div></div>` : ''}
            </div>`;
        
        return `<div id="message-${msg.id}" class="flex gap-3 fade-in ${msg.sender === 'user' ? 'justify-end' : ''}">${msg.sender === 'user' ? messageBubble + senderIcon : senderIcon + messageBubble}</div>`;
    }).join('');
    
    lucide.createIcons();
    if (!chat.messages[chat.messages.length - 1].isStreaming) scrollToBottom(D.chatContainer);
}

function renderChatList(searchQuery = '') {
    const filtered = state.chats.filter(c => c.title.toLowerCase().includes(searchQuery));
    if (filtered.length === 0) {
        D.chatList.innerHTML = `<div class="text-center text-muted-foreground py-4 text-sm">No chats found</div>`;
        return;
    }
    
    D.chatList.innerHTML = filtered.map(chat => {
        const config = MODEL_CONFIGS[chat.model];
        return `<div class="chat-item ${state.selectedChatId === chat.id ? 'active' : ''}" onclick="selectChat('${chat.id}')">
            <div class="chat-item-icon bg-gradient-to-r ${config.color} text-white">${config.icon}</div>
            <div class="flex-1 min-w-0">
                <h3 class="font-medium truncate">${escapeHtml(chat.title)}</h3>
                <p class="text-xs text-muted-foreground">${chat.date}</p>
            </div>
            <button onclick="deleteChat(event, '${chat.id}')" class="p-1 opacity-50 hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors">
                <i data-lucide="trash-2" class="h-3 w-3"></i>
            </button>
        </div>`;
    }).join('');
    
    lucide.createIcons();
}

function createNewChat(select = true) {
    const chat = {
        id: crypto.randomUUID(),
        title: 'New Conversation',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        model: state.currentModel,
        messages: []
    };
    state.chats.unshift(chat);
    if (select) selectChat(chat.id);
    return chat.id;
}

function selectChat(id) {
    if (!id && state.chats.length > 0) id = state.chats[0].id;
    if (!id) return;
    
    state.selectedChatId = id;
    const chat = state.chats.find(c => c.id === id);
    if (chat) {
        state.currentModel = chat.model;
        renderMessages();
        updateConversationData();
        if (state.viewMode === 'advanced') {
            updateAdvancedView();
        }
    }
    renderChatList();
    saveState();
    
    if (window.innerWidth <= 768 && D.sidebar.classList.contains('open')) {
        toggleSidebar();
    }
}

function deleteChat(e, id) {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    
    state.chats = state.chats.filter(c => c.id !== id);
    if (state.selectedChatId === id) {
        selectChat(state.chats[0]?.id);
    } else {
        renderChatList();
    }
    saveState();
    showToast('Chat deleted', 'success');
}

function clearChat() {
    if (!state.selectedChatId || !confirm('Clear all messages in this conversation?')) return;
    
    const chat = state.chats.find(c => c.id === state.selectedChatId);
    if (chat) {
        chat.messages = [];
        renderMessages();
        updateConversationData();
        saveState();
        showToast('Conversation cleared', 'success');
    }
}

async function regenerateResponse(index) {
    if (state.chatStatus !== 'idle') return;
    
    const chat = state.chats.find(c => c.id === state.selectedChatId);
    if (!chat || index < 1 || chat.messages[index - 1]?.sender !== 'user') return;
    
    D.messageInput.value = chat.messages[index - 1].text;
    chat.messages.splice(index - 1);
    await sendMessage();
}

// Settings management
function openSettingsModal() {
    document.getElementById('darkModeToggle').checked = state.settings.darkMode;
    document.getElementById('typingToggle').checked = state.settings.typingAnimation;
    setActiveButton(document.querySelector(`.fontSizeBtn[data-size="${state.settings.fontSize}"]`), '.fontSizeBtn');
    setActiveButton(document.querySelector(`.typingSpeedBtn[data-speed="${state.settings.typingSpeed}"]`), '.typingSpeedBtn');
    
    // Update model selection UI
    updateModelSelectionUI();
    
    // Update view selection UI
    updateViewSelectionUI();
    
    D.settingsModal.classList.remove('hidden');
}

function updateModelSelectionUI() {
    // Update current model display
    const currentModelDisplay = document.getElementById('currentModelDisplay');
    if (currentModelDisplay) {
        currentModelDisplay.textContent = MODEL_CONFIGS[state.currentModel].name;
    }
    
    // Update radio buttons
    document.querySelectorAll('.model-radio').forEach(radio => {
        const model = radio.dataset.model;
        if (model === state.currentModel) {
            radio.style.backgroundColor = 'rgb(var(--primary))';
            radio.style.borderColor = 'rgb(var(--primary))';
            radio.innerHTML = '<div style="width: 100%; height: 100%; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; border-radius: 50%; background: rgb(var(--primary));"></div></div>';
        } else {
            radio.style.backgroundColor = 'transparent';
            radio.style.borderColor = 'rgb(var(--muted-foreground), 0.3)';
            radio.innerHTML = '';
        }
    });
    
    // Update button borders
    document.querySelectorAll('.model-option-btn').forEach(btn => {
        const model = btn.dataset.model;
        if (model === state.currentModel) {
            btn.style.borderColor = 'rgb(var(--primary))';
            btn.style.backgroundColor = 'rgba(var(--primary), 0.1)';
        } else {
            btn.style.borderColor = 'transparent';
            btn.style.backgroundColor = 'transparent';
        }
    });
}

function updateViewSelectionUI() {
    // Update current view display
    const currentViewDisplay = document.getElementById('currentViewDisplay');
    if (currentViewDisplay) {
        currentViewDisplay.textContent = state.settings.viewMode === 'normal' ? 'Normal' : 'Advanced';
    }
    
    // Update radio buttons
    document.querySelectorAll('.view-radio').forEach(radio => {
        const view = radio.dataset.view;
        if (view === state.settings.viewMode) {
            radio.style.backgroundColor = 'rgb(var(--primary))';
            radio.style.borderColor = 'rgb(var(--primary))';
            radio.innerHTML = '<div style="width: 100%; height: 100%; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; border-radius: 50%; background: rgb(var(--primary));"></div></div>';
        } else {
            radio.style.backgroundColor = 'transparent';
            radio.style.borderColor = 'rgb(var(--muted-foreground), 0.3)';
            radio.innerHTML = '';
        }
    });
    
    // Update button borders
    document.querySelectorAll('.view-option-btn').forEach(btn => {
        const view = btn.dataset.view;
        if (view === state.settings.viewMode) {
            btn.style.borderColor = 'rgb(var(--primary))';
            btn.style.backgroundColor = 'rgba(var(--primary), 0.1)';
        } else {
            btn.style.borderColor = 'transparent';
            btn.style.backgroundColor = 'transparent';
        }
    });
}

function selectModelInSettings(model) {
    state.currentModel = model;
    updateModelSelectionUI();
    
    // Update current chat model if exists
    if (state.selectedChatId) {
        const chat = state.chats.find(c => c.id === state.selectedChatId);
        if (chat) {
            chat.model = model;
        }
    }
    
    showToast(`Switched to ${MODEL_CONFIGS[model].name}`, 'info');
}

function selectViewInSettings(view) {
    state.settings.viewMode = view;
    updateViewSelectionUI();
    
    if (view === 'advanced') {
        showToast('Advanced view enabled - Claude-like interface', 'info');
    } else {
        showToast('Normal view enabled', 'info');
    }
}

function saveSettings() {
    state.settings.darkMode = document.getElementById('darkModeToggle').checked;
    state.settings.typingAnimation = document.getElementById('typingToggle').checked;
    state.settings.fontSize = document.querySelector('.fontSizeBtn.active').dataset.size;
    state.settings.typingSpeed = document.querySelector('.typingSpeedBtn.active').dataset.speed;
    
    applySettings();
    saveState();
    D.settingsModal.classList.add('hidden');
    showToast('Settings saved!', 'success');
}

function resetSettings() {
    state.settings = { ...defaultSettings };
    openSettingsModal();
}

function applySettings() {
    D.html.classList.toggle('dark', state.settings.darkMode);
    
    const sizeMap = {
        small: 'var(--font-size-sm)',
        medium: 'var(--font-size-base)',
        large: 'var(--font-size-lg)'
    };
    D.html.style.fontSize = sizeMap[state.settings.fontSize];
}

// View mode management
function toggleViewMode() {
    if (state.settings.viewMode === 'normal') {
        state.settings.viewMode = 'advanced';
        D.mainContent.classList.add('hidden');
        D.advancedView.classList.remove('hidden');
        updateAdvancedView();
    } else {
        state.settings.viewMode = 'normal';
        D.mainContent.classList.remove('hidden');
        D.advancedView.classList.add('hidden');
    }
    
    saveState();
}

function updateAdvancedView() {
    const chat = state.chats.find(c => c.id === state.selectedChatId);
    if (!chat) return;
    
    // Update conversation data
    updateConversationData();
    
    // Update UI elements
    if (D.currentTopic) D.currentTopic.textContent = state.conversationData.currentTopic;
    if (D.messageCount) D.messageCount.textContent = state.conversationData.messageCount;
    if (D.wordCount) D.wordCount.textContent = state.conversationData.wordCount;
    if (D.topicCount) D.topicCount.textContent = state.conversationData.topics.length;
    
    // Update key points
    if (D.keyPoints) {
        D.keyPoints.innerHTML = state.conversationData.keyPoints.map(point => 
            `<div class="context-list-item">${point}</div>`
        ).join('');
    }
    
    // Update related topics
    if (D.relatedTopics) {
        D.relatedTopics.innerHTML = state.conversationData.topics.map(topic => 
            `<div class="context-list-item">${topic}</div>`
        ).join('');
    }
    
    // Update conversation flow
    updateVisualization();
    
    // Update topic cloud
    updateTopicsAnalysis();
}

function updateConversationData() {
    const chat = state.chats.find(c => c.id === state.selectedChatId);
    if (!chat) return;
    
    // Calculate basic stats
    state.conversationData.messageCount = chat.messages.length;
    state.conversationData.wordCount = chat.messages.reduce((sum, msg) => sum + msg.text.split(' ').length, 0);
    
    // Extract topics and key points
    const allText = chat.messages.map(msg => msg.text.toLowerCase()).join(' ');
    const words = allText.split(' ').filter(word => word.length > 3);
    
    // Simple topic extraction (in real app, this would use NLP)
    const commonWords = ['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'been'];
    const filteredWords = words.filter(word => !commonWords.includes(word));
    
    const wordFreq = {};
    filteredWords.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    state.conversationData.topics = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
    
    // Extract key points (simplified)
    state.conversationData.keyPoints = chat.messages
        .filter(msg => msg.sender === 'ai' && msg.text.length > 50)
        .slice(0, 3)
        .map(msg => msg.text.substring(0, 60) + '...');
    
    // Update current topic
    if (chat.messages.length > 0) {
        const lastMessage = chat.messages[chat.messages.length - 1];
        state.conversationData.currentTopic = lastMessage.text.substring(0, 50) + (lastMessage.text.length > 50 ? '...' : '');
    }
}

function updateVisualization() {
    if (!D.conversationFlow) return;
    
    const chat = state.chats.find(c => c.id === state.selectedChatId);
    if (!chat || chat.messages.length === 0) return;
    
    // Create conversation flow visualization
    const flowNodes = chat.messages.slice(0, 5).map((msg, index) => {
        const isUser = msg.sender === 'user';
        const preview = msg.text.substring(0, 20) + (msg.text.length > 20 ? '...' : '');
        return `
            <div class="flow-node ${isUser ? 'user' : 'ai'}">
                <div class="node-content">${isUser ? 'You' : 'AI'}: ${preview}</div>
            </div>
        `;
    }).join('');
    
    D.conversationFlow.innerHTML = `
        <div class="flow-node start">
            <div class="node-content">Start</div>
        </div>
        ${flowNodes}
        ${chat.messages.length > 5 ? '<div class="flow-node"><div class="node-content">...</div></div>' : ''}
    `;
}

function updateTopicsAnalysis() {
    if (!D.topicsAnalysis) return;
    
    const topics = state.conversationData.topics;
    if (topics.length === 0) return;
    
    D.topicsAnalysis.innerHTML = `
        <div class="topic-cloud">
            ${topics.map(topic => `<div class="topic-tag">${topic}</div>`).join('')}
        </div>
    `;
}

async function generateInsights() {
    if (!D.aiInsights) return;
    
    const chat = state.chats.find(c => c.id === state.selectedChatId);
    if (!chat || chat.messages.length === 0) return;
    
    // Show loading state
    D.aiInsights.innerHTML = `
        <div class="insight-item">
            <div class="insight-icon">⚡</div>
            <div class="insight-text">Analyzing conversation...</div>
        </div>
    `;
    
    try {
        // Simulate AI insights (in real app, this would call an AI analysis endpoint)
        setTimeout(() => {
            const insights = [
                {
                    icon: '🧠',
                    text: `Conversation covers ${state.conversationData.topics.length} main topics with ${state.conversationData.messageCount} total messages.`
                },
                {
                    icon: '📊',
                    text: `Average response length: ${Math.round(state.conversationData.wordCount / state.conversationData.messageCount)} words per message.`
                },
                {
                    icon: '🎯',
                    text: `Primary focus appears to be on ${state.conversationData.topics[0] || 'general discussion'}.`
                }
            ];
            
            D.aiInsights.innerHTML = insights.map(insight => `
                <div class="insight-item">
                    <div class="insight-icon">${insight.icon}</div>
                    <div class="insight-text">${insight.text}</div>
                </div>
            `).join('');
        }, 1500);
    } catch (error) {
        D.aiInsights.innerHTML = `
            <div class="insight-item">
                <div class="insight-icon">❌</div>
                <div class="insight-text">Failed to generate insights</div>
            </div>
        `;
    }
}

function exportAdvancedData() {
    const chat = state.chats.find(c => c.id === state.selectedChatId);
    if (!chat) return;
    
    const exportData = {
        conversation: chat,
        analysis: state.conversationData,
        exportedAt: new Date().toISOString(),
        viewMode: 'advanced'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aj-advanced-analysis-${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Advanced analysis exported', 'success');
}

// Utility functions
function setChatStatus(status) {
    state.chatStatus = status;
    
    if (status === 'waiting' || status === 'streaming') {
        D.messageInput.disabled = true;
        D.messageInput.placeholder = 'AI is responding...';
        
        if (status === 'streaming') {
            D.sendBtn.innerHTML = `<i data-lucide="square" class="h-4 w-4"></i>`;
            D.sendBtn.onclick = () => state.abortController?.abort();
            D.sendBtn.title = "Stop Generating";
        } else {
            D.sendBtn.innerHTML = `<div class="spinner"></div>`;
            D.sendBtn.onclick = null;
        }
        D.sendBtn.disabled = false;
    } else {
        D.sendBtn.disabled = false;
        D.sendBtn.innerHTML = `<i data-lucide="send" class="h-4 w-4"></i>`;
        D.sendBtn.onclick = sendMessage;
        D.sendBtn.title = "Send Message";
        D.messageInput.disabled = false;
        D.messageInput.placeholder = 'Message AJ...';
    }
    
    lucide.createIcons();
}

function toggleSidebar() {
    D.sidebar.classList.toggle('open');
    D.sidebarOverlay.classList.toggle('show');
}

function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function setActiveButton(target, selector) {
    document.querySelectorAll(selector).forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-primary-foreground');
        btn.classList.add('bg-secondary', 'text-secondary-foreground');
    });
    target.classList.add('active', 'bg-primary', 'text-primary-foreground');
    target.classList.remove('bg-secondary', 'text-secondary-foreground');
}

function setSuggestion(text) {
    D.messageInput.value = text;
    D.messageInput.focus();
    sendMessage();
}

function exportChat() {
    const chat = state.chats.find(c => c.id === state.selectedChatId);
    if (!chat) return;
    
    const chatData = {
        title: chat.title,
        messages: chat.messages,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Chat exported', 'success');
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };
    
    toast.className = `toast ${colors[type]} text-white`;
    toast.style.cssText = 'background-color:rgb(var(--card));color:rgb(var(--foreground));border:1px solid hsl(var(--border));border-radius:0.5rem;padding:0.75rem 1rem;box-shadow:0 4px 12px rgba(0, 0, 0, 0.05);margin-bottom:0.5rem;animation:slideIn 0.3s ease-out;';
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toastContainer.removeChild(toast), 300);
    }, 3000);
}

function processMessageText(text) {
    if (!text) return '';
    
    let html = escapeHtml(text).replace(/\n/g, '<br>');
    
    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code blocks
    html = html.replace(/```(\w*)\s*<br>([\s\S]*?)<br>```/g, (_, lang, code) => {
        const language = lang || 'text';
        const decodedCode = code.replace(/<br>/g, '\n');
        return `</div><div class="code-block" data-code="${escapeHtml(decodedCode)}">
            <div class="code-header">
                <span>${language}</span>
                <button onclick="copyCode(this)">
                    <i data-lucide="copy" class="h-3 w-3"></i>Copy
                </button>
            </div>
            <div class="code-content">
                <pre><code>${decodedCode}</code></pre>
            </div>
        </div><div class="message-content">`;
    });
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Lists
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<ul><li>$1</li></ul>')
               .replace(/<\/ul><br><ul>/g, '');
    html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<ol><li>$1</li></ol>')
               .replace(/<\/ol><br><ol>/g, '');
    
    return html;
}

function isScrolledToBottom(el) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 50;
}

function scrollToBottom(el, behavior = 'smooth') {
    el.scrollTo({ top: el.scrollHeight, behavior: behavior });
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

function copyMessage(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Message copied!', 'success'));
}

function copyCode(btn) {
    const code = btn.closest('.code-block').dataset.code;
    navigator.clipboard.writeText(code).then(() => showToast('Code copied!', 'success'));
}

// State persistence
function saveState() {
    if (state.settings.autoSave) {
        localStorage.setItem('ajstudioz_chats', JSON.stringify(state.chats));
        localStorage.setItem('ajstudioz_settings', JSON.stringify(state.settings));
        localStorage.setItem('ajstudioz_lastChatId', state.selectedChatId);
    }
}

function loadState() {
    const chats = localStorage.getItem('ajstudioz_chats');
    const settings = localStorage.getItem('ajstudioz_settings');
    const lastChatId = localStorage.getItem('ajstudioz_lastChatId');
    
    if (chats) {
        state.chats = JSON.parse(chats);
    }
    
    if (settings) {
        state.settings = { ...defaultSettings, ...JSON.parse(settings) };
        state.viewMode = state.settings.viewMode;
    }
    
    if (lastChatId) {
        state.selectedChatId = lastChatId;
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'k':
                e.preventDefault();
                document.getElementById('search-input')?.focus();
                break;
            case 'n':
                e.preventDefault();
                createNewChat(true);
                break;
            case '/':
                e.preventDefault();
                D.messageInput.focus();
                break;
            case 'e':
                e.preventDefault();
                exportChat();
                break;
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        D.settingsModal.classList.add('hidden');
        if (state.settings.viewMode === 'advanced') {
            toggleViewMode();
        }
    }
});

// Make functions globally available
window.toggleSidebar = toggleSidebar;
window.selectChat = selectChat;
window.deleteChat = deleteChat;
window.regenerateResponse = regenerateResponse;
window.copyMessage = copyMessage;
window.copyCode = copyCode;
window.setSuggestion = setSuggestion;
window.toggleViewMode = toggleViewMode;

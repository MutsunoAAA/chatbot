class ChatBot {
    constructor() {
        this.apiKey = 'AIzaSyBQD6enNsQ6fia53qi2qGMgPKVY2jQbE8g';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        this.conversationHistory = [];
        this.userInfo = {
            name: null,
            school: null,
            hasGreeted: false
        };
        this.messageCount = 0;
        
        this.systemPrompt = `あなたは小学生・中学生の相談相手となる優しいお姉さんです。以下の特徴を持ってください：

1. 性格：
   - おっとりとした優しいお姉さん
   - 相手に寄り添い、共感する
   - 温かく受け入れる態度
   - 決して否定的にならない

2. 話し方：
   - 丁寧語と親しみやすい口調のバランス
   - 「〜ですね」「〜ですよ」「〜だと思うよ」などの優しい表現
   - 適度に絵文字や「♪」「♡」を使用
   - 相手の気持ちに共感する言葉を多用

3. 会話の進め方：
   - 自然な流れで相手の名前を聞く
   - さりげなく学校のことも聞く
   - 悩みや相談に真摯に答える
   - 励ましやアドバイスを提供

4. 注意点：
   - 年齢に適した内容で話す
   - プライバシーに配慮する
   - 安全で健全な内容のみ
   
現在の相手の情報：
- 名前: ${this.userInfo.name || '未確認'}
- 学校: ${this.userInfo.school || '未確認'}`;

        this.init();
    }

    init() {
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.characterImage = document.getElementById('characterImage');

        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        this.startGreeting();
    }

    startGreeting() {
        setTimeout(() => {
            this.addBotMessage("こんにちは！私はあなたの相談相手になるお姉さんです♪ 何でも気軽に話しかけてくださいね。悩みがあったら一緒に考えましょう♡");
            this.animateCharacter();
        }, 1000);
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.addUserMessage(message);
        this.messageInput.value = '';
        this.showLoading(true);

        try {
            const response = await this.callGeminiAPI(message);
            this.addBotMessage(response);
            this.animateCharacter();
            this.extractUserInfo(message, response);
            this.saveConversation(message, response);
        } catch (error) {
            console.error('API Error:', error);
            this.addBotMessage("ごめんなさい、少し調子が悪いみたいです。もう一度話しかけてくれますか？");
        }

        this.showLoading(false);
    }

    async callGeminiAPI(userMessage) {
        this.conversationHistory.push(`ユーザー: ${userMessage}`);
        
        const fullPrompt = `${this.systemPrompt}

過去の会話:
${this.conversationHistory.slice(-10).join('\n')}

最新のメッセージ: ${userMessage}

上記を踏まえて、お姉さんらしく優しく返答してください。`;

        const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: fullPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const botResponse = data.candidates[0].content.parts[0].text;
        
        this.conversationHistory.push(`お姉さん: ${botResponse}`);
        return botResponse;
    }

    addUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(message)}</div>
            <div class="message-time">${this.getCurrentTime()}</div>
        `;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addBotMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(message)}</div>
            <div class="message-time">${this.getCurrentTime()}</div>
        `;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    animateCharacter() {
        this.characterImage.classList.add('talking');
        setTimeout(() => {
            this.characterImage.classList.remove('talking');
        }, 1000);
    }

    extractUserInfo(userMessage, botResponse) {
        if (!this.userInfo.name) {
            const namePatterns = [
                /私は([ぁ-んァ-ンa-zA-Z]+)です/,
                /([ぁ-んァ-ンa-zA-Z]+)と申します/,
                /([ぁ-んァ-ンa-zA-Z]+)と言います/,
                /名前は([ぁ-んァ-ンa-zA-Z]+)/,
                /([ぁ-んァ-ンa-zA-Z]+)って呼んで/
            ];
            
            for (const pattern of namePatterns) {
                const match = userMessage.match(pattern);
                if (match) {
                    this.userInfo.name = match[1];
                    break;
                }
            }
        }

        if (!this.userInfo.school) {
            const schoolPatterns = [
                /([ぁ-んァ-ン一-龯]+[小中]学校)/,
                /([ぁ-んァ-ン一-龯]+小学校)/,
                /([ぁ-んァ-ン一-龯]+中学校)/,
                /([ぁ-んァ-ン一-龯]+学園)/
            ];
            
            for (const pattern of schoolPatterns) {
                const match = userMessage.match(pattern);
                if (match) {
                    this.userInfo.school = match[1];
                    break;
                }
            }
        }
    }

    async saveConversation(userMessage, botResponse) {
        const data = {
            timestamp: new Date().toISOString(),
            userName: this.userInfo.name || '未確認',
            schoolName: this.userInfo.school || '未確認',
            userMessage: userMessage,
            botResponse: botResponse
        };

        try {
            await this.sendToGoogleSheets(data);
        } catch (error) {
            console.error('Failed to save to Google Sheets:', error);
        }
    }

    async sendToGoogleSheets(data) {
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbwl8VSEWQbORfxLBwteADXFtzzIXeqcTfjL3WPoBzdwup7CCTSPywP94rSxX31v3MkUVg/exec';
        
        const formData = new FormData();
        formData.append('timestamp', data.timestamp);
        formData.append('userName', data.userName);
        formData.append('schoolName', data.schoolName);
        formData.append('userMessage', data.userMessage);
        formData.append('botResponse', data.botResponse);

        await fetch(scriptUrl, {
            method: 'POST',
            body: formData
        });
    }

    showLoading(show) {
        if (show) {
            this.loadingIndicator.classList.add('show');
        } else {
            this.loadingIndicator.classList.remove('show');
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatBot();
});
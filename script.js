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
        this.personalitySettings = {};
        
        this.currentEmotion = 'default';
        this.emotionKeywords = {
            sad: ['悲しい', 'つらい', '辛い', '泣い', '寂しい', 'しんどい', '落ち込', '哀しい', '涙', 'むなしい'],
            worried: ['心配', '困った', 'どうしよう', '不安', '悩み', '問題', 'まずい', 'やばい', '迷惑'],
            happy: ['嬉しい', '楽しい', 'やったー', 'わーい', '最高', 'ありがとう', '感謝'],
            excited: ['頑張って', '応援', 'ファイト', 'できる', '挑戦', '元気', 'パワー'],
            thinking: ['なぜ', 'どうして', 'わからない', '教えて', '質問', '考え']
        };
        
        this.systemPrompt = this.generateSystemPrompt();

        this.loadPersonalitySettings().then(() => {
            this.init();
        });
    }

    async loadPersonalitySettings() {
        try {
            const scriptUrl = 'https://script.google.com/macros/s/AKfycbwl8VSEWQbORfxLBwteADXFtzzIXeqcTfjL3WPoBzdwup7CCTSPywP94rSxX31v3MkUVg/exec';
            const response = await fetch(`${scriptUrl}?action=getPersonality`);
            const settings = await response.json();
            
            if (settings) {
                this.personalitySettings = settings;
                this.systemPrompt = this.generateSystemPrompt();
            }
        } catch (error) {
            console.error('Failed to load personality settings:', error);
        }
    }

    generateSystemPrompt() {
        const settings = this.personalitySettings;
        
        return `あなたは小学生・中学生の相談相手となる優しいお姉さんです。以下の特徴を持ってください：

1. 性格：
   - ${settings['基本性格'] || 'おっとりとした優しいお姉さん'}
   - 相手に寄り添い、共感する
   - 温かく受け入れる態度
   - 決して否定的にならない

2. 話し方：
   - ${settings['話し方の特徴'] || '丁寧語と親しみやすい口調のバランス'}
   - 一人称：${settings['一人称'] || '私'}
   - 相手への呼び方：${settings['相手への呼び方'] || 'あなた'}
   - 感情表現：${settings['感情表現の強さ'] || '控えめ'}
   - 絵文字の使用：${settings['絵文字の使用'] || '控えめ'}

3. 会話の進め方：
   - 自然な流れで相手の名前を聞く
   - さりげなく学校のことも聞く
   - ${settings['質問への対応'] || '悩みや相談に真摯に答える'}
   - ${settings['アドバイスの傾向'] || '優しく提案する'}
   - ${settings['励まし方のスタイル'] || '共感重視'}で励ます

4. キャラクター設定：
   - 年齢：${settings['年齢設定'] || '20代前半'}
   - 専門分野：${settings['専門分野'] || '心理学・教育'}
   - 趣味・関心：${settings['趣味・関心'] || '読書・音楽鑑賞'}

5. 注意点：
   - 年齢に適した内容で話す
   - プライバシーに配慮する
   - 安全で健全な内容のみ
   - 返答の長さ：${settings['返答の長さ'] || '100-350字程度'}
   
現在の相手の情報：
- 名前: ${this.userInfo.name || '未確認'}
- 学校: ${this.userInfo.school || '未確認'}`;
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
            this.addBotMessage("こんにちは！私はあなたの相談相手になるお姉さんです。何でも気軽に話しかけてくださいね。悩みがあったら一緒に考えましょう。");
            this.animateCharacter('happy');
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
            this.animateCharacter(null, message, response);
            this.extractUserInfo(message, response);
            this.saveConversation(message, response);
        } catch (error) {
            console.error('API Error:', error);
            this.addBotMessage("ごめんなさい、少し調子が悪いみたいです。もう一度話しかけてくれますか？");
            this.animateCharacter('worried');
        }

        this.showLoading(false);
    }

    async callGeminiAPI(userMessage) {
        this.conversationHistory.push(`ユーザー: ${userMessage}`);
        
        const fullPrompt = `${this.systemPrompt}

過去の会話:
${this.conversationHistory.slice(-20).join('\n')}

最新のメッセージ: ${userMessage}

上記を踏まえて、過去の会話内容を踏まえて自然な流れで返答してください。
- 前の話題や相手が言った内容に触れながら会話を続ける
- 相手の感情や状況を覚えていることを示す
- 「さっき～って言ってたけど」「前にお話しした～」のような繋がりを意識する
- お姉さんらしく優しく返答する
- 返答は100字から350字程度の長さで自然にまとめる`;

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

    analyzeEmotion(userMessage, botResponse) {
        // ユーザーメッセージのみを分析（bot応答は除外）
        const userText = userMessage.toLowerCase();
        
        // ネガティブな感情を優先的に判定
        const priorityOrder = ['sad', 'worried', 'happy', 'excited', 'thinking'];
        
        for (const emotion of priorityOrder) {
            const keywords = this.emotionKeywords[emotion];
            for (const keyword of keywords) {
                if (userText.includes(keyword)) {
                    return emotion;
                }
            }
        }
        
        return 'default';
    }

    changeCharacterEmotion(emotion) {
        const characterImg = document.getElementById('characterImg');
        const characterImage = document.getElementById('characterImage');
        const placeholder = document.querySelector('.placeholder-character');
        
        characterImage.className = 'character-image';
        
        // 画像が存在するかチェック
        const tempImg = new Image();
        tempImg.onload = () => {
            // 画像が正常に読み込めた場合
            characterImg.style.display = 'block';
            placeholder.style.display = 'none';
            
            if (emotion === 'talking') {
                characterImg.src = 'character_talking.png';
                characterImage.classList.add('talking');
            } else {
                characterImg.src = `character_${emotion}.png`;
                if (emotion !== 'default') {
                    characterImage.classList.add(emotion);
                }
            }
        };
        tempImg.onerror = () => {
            // 画像が読み込めない場合はプレースホルダーを表示
            characterImg.style.display = 'none';
            placeholder.style.display = 'flex';
        };
        tempImg.src = emotion === 'talking' ? 'character_talking.png' : `character_${emotion}.png`;
        
        this.currentEmotion = emotion;
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

    animateCharacter(emotion = null, userMessage = '', botResponse = '') {
        this.changeCharacterEmotion('talking');
        
        setTimeout(() => {
            const analyzedEmotion = emotion || this.analyzeEmotion(userMessage, botResponse);
            this.changeCharacterEmotion(analyzedEmotion);
            
            setTimeout(() => {
                if (this.currentEmotion !== 'default') {
                    this.changeCharacterEmotion('default');
                }
            }, 3000);
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
                    this.systemPrompt = this.generateSystemPrompt(); // 情報更新時にプロンプト再生成
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
                    this.systemPrompt = this.generateSystemPrompt(); // 情報更新時にプロンプト再生成
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

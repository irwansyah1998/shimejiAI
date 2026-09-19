// ==UserScript==
// @name         Shimeji AI Assistant
// @namespace    http://tampermonkey.net/
// @version      1.2.4 (Beta)
// @description  Interactive 2D Shimeji assistant with DOM physics, draggable movement, and AI chat integration.
// @author       Irwansyah
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.openai.com
// @connect      generativelanguage.googleapis.com
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ==========================================================
    // KONFIGURASI
    // ==========================================================
    // Konfigurasi umum untuk AI, kontrol fisika, dan asset karakter.
    // Ganti nilai API key dan URL sprite sesuai kebutuhan project Anda.
    // Cara pakai API Key:
    // 1. Ganti 'sk-YOUR_OPENAI_API_KEY_HERE' dengan key OpenAI Anda.
    // 2. Jika mau pakai Gemini, ubah AI_PROVIDER menjadi 'gemini' dan isi GEMINI_API_KEY.
    // 3. Jika script sedang dipakai untuk website pihak ketiga, penggunaan GM_xmlhttpRequest
    //    menghindari masalah CORS tanpa mengubah izin browser.
    const CONFIG = {
        AI_PROVIDER: 'openai', // 'openai' atau 'gemini'
        API_KEY: 'sk-YOUR_OPENAI_API_KEY_HERE',
        GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
        OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
        GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        MODEL: 'gpt-4o-mini',
        SYSTEM_PROMPT: 'Kamu adalah asisten virtual bergaya anime, ceria, pintar, dan ringkas. Jawab singkat tapi jelas.',

        // [SPRITE-SIZE] Ukuran sumber yang direkomendasikan: 100x100 atau 128x128 px persegi.
        // [SPRITE-SIZE] Ukuran minimum: 32x32 px; gambar lebih kecil akan terlihat pecah saat diperbesar.
        // [SPRITE-SIZE] Batas maksimum praktis: 512x512 px per gambar/frame agar userscript tetap ringan.
        // [SPRITE-SIZE] Pertahankan rasio 1:1 dan gunakan background transparan; rasio non-persegi
        // dapat membuat pose terlihat gepeng karena setiap sprite dipasang pada kotak karakter persegi.
        // [SPRITE-SIZE] Untuk raster PNG/WebP, usahakan data base64 di bawah 200 KB per frame.
        // SVG base64 sebaiknya tetap ringkas dan memakai viewBox="0 0 100 100" atau setara.
        // [SPRITE-SIZE] Sisakan margin transparan sekitar 4-8 px di tepi sumber. Layer renderer
        // memakai overscan 4% untuk mengurangi padding visual tanpa memotong bagian tubuh penting.
        // [SPRITE-RENDER] Hasil akhir dirender pada CHARACTER_SIZE (default 80x80 px); sumber
        // 100x100/128x128 akan diperkecil dengan baik, sedangkan sumber di atas 512x512 tidak dianjurkan.
        // [SPRITE-FORMAT] Setelah memilih gambar, ubah menjadi data URI, contoh:
        // data:image/png;base64,... atau data:image/svg+xml;base64,...
        SPRITE_IDLE: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzRhOTBlMiIvPjxjaXJjbGUgY3g9IjM1IiBjeT0iNDAiIHI9IjUiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI2NSIgY3k9IjQwIiByPSI1IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTQwIDYwIFExIDYwIDYwIDYwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iNSIvPjwvc3ZnPg==',
        SPRITE_DRAG: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2U3NGMzYyIvPjxjaXJjbGUgY3g9IjM1IiBjeT0iNDAiIHI9IjgiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI2NSIgY3k9IjQwIiByPSI4IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTQ1IDY1IFE1MCA3MCA1NSA2NSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48L3N2Zz4=',
        SPRITE_CLIMB: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzYxZWY4NSIvPjxjaXJjbGUgY3g9IjM1IiBjeT0iNDAiIHI9IjUiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI2NSIgY3k9IjQwIiByPSI1IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTM1IDY2IFI0NiA3OSAzNSA2NiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48L3N2Zz4=',
        // Semua frame gerak menggunakan data URI base64 agar tetap offline dan stabil.
        SPRITE_JUMP: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2YwYTRkYiIvPjxjaXJjbGUgY3g9IjM1IiBjeT0iNDAiIHI9IjYiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI2NSIgY3k9IjQwIiByPSI2IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTM1IDYwIEwxNSA0NSBNNjUgNjAgTDg1IDQ1IE00MCA2NSBRNTAgNzAgNjAgNjUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI0IiBmaWxsPSJub25lIi8+PC9zdmc+',
        SPRITE_TALK: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzOCIgdmlsbD0ibm9uZSIgZmlsbD0iIzkwN2RlZiIvPjxjaXJjbGUgY3g9IjM4IiBjeT0iNDAiIHI9IjYiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI2MiIgY3k9IjQwIiByPSI2IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMzgiIGN5PSI0MCIgcj0iMiIgZmlsbD0iIzIyMiIvPjxjaXJjbGUgY3g9IjYyIiBjeT0iNDAiIHI9IjIiIGZpbGw9IiMyMjIiLz48cGF0aCBkPSJNMzggNjAgUTUwIDc4IDYyIDYwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+',

        GRAVITY: 0.8,
        FRICTION: 0.86,
        MAX_SPEED: 9,
        // [SPRITE-RENDER] Ukuran kotak render karakter dalam px; rekomendasi 64-128, maksimum praktis 256.
        CHARACTER_SIZE: 80,
        PLATFORM_MARGIN: 16,
        QUESTION_PAUSE_MS: 5000,
        MAX_PROMPT_LENGTH: 2000,
        API_TIMEOUT_MS: 30000,
        MAX_FRAME_DELTA_MS: 50,
        PLATFORM_SCAN_INTERVAL_MS: 500,
        ANSWER_ANIMATION_MS: 1800,
        MAX_CHAT_MESSAGES: 100,
        MAX_RESPONSE_LENGTH: 12000,
        STUCK_TIMEOUT_MS: 1100,
        STUCK_DISTANCE_PX: 3,
        OBSTACLE_LOOKAHEAD_PX: 18,
        RECOVERY_COOLDOWN_MS: 1200,
        ENABLE_DESCENDING: true,
        DESCENDING_CHANCE: 0.18,
        DESCENDING_DURATION_MS: 260,
        PHYSICS_REFERENCE_FRAME_MS: 1000 / 60,
        TURN_COOLDOWN_MS: 450,
        WALK_ACCELERATION: 0.12,
        // [SPRITE-RENDER] Skala visual 0.90-1.15 dianjurkan; nilai terlalu besar dapat memotong pose.
        SPRITE_SCALE: 1.08
    };

    /**
     * Menambahkan stylesheet global untuk lingkungan Tampermonkey.
     * Fungsi ini bersifat opsional dan hanya dipanggil bila browser
     * menyediakan GM_addStyle.
     * @param {string} cssText - CSS yang akan dimasukkan ke halaman.
     */
    function addGlobalStyle(cssText) {
        if (typeof GM_addStyle === 'function') {
            GM_addStyle(cssText);
        }
    }

    // ==========================================================
    // 1. API CONNECTOR
    // ==========================================================
    /**
     * Kelas untuk menghubungkan script ke AI provider.
     * Menyembunyikan detail request OpenAI/Gemini agar logika utama tetap bersih.
     */
    class APIConnector {
        /**
         * Memvalidasi dan mengambil teks dari payload provider tanpa mempercayai bentuk respons eksternal.
         * [SECURITY] Validasi eksplisit mencegah nilai object/array malformed masuk ke DOM sebagai teks.
         * Kompleksitas: O(R), dengan R sebagai panjang respons yang diproses.
         */
        static extractText(value) {
            if (typeof value === 'string') {
                return value.trim().slice(0, CONFIG.MAX_RESPONSE_LENGTH);
            }

            if (Array.isArray(value)) {
                return value
                    .map((part) => (typeof part === 'string' ? part : part?.text || ''))
                    .filter(Boolean)
                    .join('')
                    .trim()
                    .slice(0, CONFIG.MAX_RESPONSE_LENGTH);
            }

            return '';
        }

        /**
         * Memilih provider AI aktif dan menjalankan request.
         * @param {string} prompt - Pertanyaan atau perintah user.
         * @returns {Promise<string>} Jawaban AI.
         */
        static async askAI(prompt) {
            const isPlaceholder = (value) => typeof value !== 'string' || !value.trim() || value.includes('YOUR_') || value.includes('PASTE_');
            const normalizedPrompt = typeof prompt === 'string' ? prompt.trim().slice(0, CONFIG.MAX_PROMPT_LENGTH) : '';

            if (!normalizedPrompt) {
                return 'Tulis pertanyaan terlebih dahulu.';
            }

            if (CONFIG.AI_PROVIDER === 'gemini') {
                if (isPlaceholder(CONFIG.GEMINI_API_KEY)) {
                    return '⚠️ Gemini API Key belum diatur. Ganti di konfigurasi script.';
                }
                return this.askGemini(normalizedPrompt);
            }

            if (CONFIG.AI_PROVIDER !== 'openai') {
                return 'AI provider tidak valid. Gunakan "openai" atau "gemini".';
            }

            if (isPlaceholder(CONFIG.API_KEY)) {
                return '⚠️ OpenAI API Key belum diatur. Ganti di konfigurasi script.';
            }

            return this.askOpenAI(normalizedPrompt);
        }

        static askOpenAI(prompt) {
            return new Promise((resolve, reject) => {
                if (typeof GM_xmlhttpRequest !== 'function') {
                    reject('Tampermonkey GM_xmlhttpRequest tidak tersedia.');
                    return;
                }

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: CONFIG.OPENAI_API_URL,
                    timeout: CONFIG.API_TIMEOUT_MS,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${CONFIG.API_KEY}`
                    },
                    data: JSON.stringify({
                        model: CONFIG.MODEL,
                        messages: [
                            { role: 'system', content: CONFIG.SYSTEM_PROMPT },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.7
                    }),
                    onload(response) {
                        if (!response || response.status < 200 || response.status >= 300) {
                            reject(`OpenAI mengembalikan HTTP ${response?.status || 0}.`);
                            return;
                        }

                        try {
                            if (typeof response.responseText !== 'string' || response.responseText.length > CONFIG.MAX_RESPONSE_LENGTH) {
                                reject('Respons OpenAI terlalu besar atau tidak valid.');
                                return;
                            }
                            const res = JSON.parse(response.responseText);
                            const text = APIConnector.extractText(res?.choices?.[0]?.message?.content);
                            resolve(text || 'AI tidak memberikan jawaban.');
                        } catch (error) {
                            reject('Error parsing response dari OpenAI.');
                        }
                    },
                    onerror() {
                        reject('Koneksi ke OpenAI gagal. Periksa network / key / CORS.');
                    },
                    ontimeout() {
                        reject('Permintaan OpenAI timeout.');
                    }
                });
            });
        }

        static askGemini(prompt) {
            return new Promise((resolve, reject) => {
                if (typeof GM_xmlhttpRequest !== 'function') {
                    reject('Tampermonkey GM_xmlhttpRequest tidak tersedia.');
                    return;
                }

                const body = {
                    contents: [
                        {
                            parts: [
                                { text: `${CONFIG.SYSTEM_PROMPT}\n\n${prompt}` }
                            ]
                        }
                    ]
                };

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${CONFIG.GEMINI_API_URL}?key=${encodeURIComponent(CONFIG.GEMINI_API_KEY)}`,
                    timeout: CONFIG.API_TIMEOUT_MS,
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(body),
                    onload(response) {
                        if (!response || response.status < 200 || response.status >= 300) {
                            reject(`Gemini mengembalikan HTTP ${response?.status || 0}.`);
                            return;
                        }

                        try {
                            if (typeof response.responseText !== 'string' || response.responseText.length > CONFIG.MAX_RESPONSE_LENGTH) {
                                reject('Respons Gemini terlalu besar atau tidak valid.');
                                return;
                            }
                            const res = JSON.parse(response.responseText);
                            const text = APIConnector.extractText(res?.candidates?.[0]?.content?.parts);
                            resolve(text || 'AI tidak memberikan jawaban.');
                        } catch (error) {
                            reject('Error parsing response dari Gemini.');
                        }
                    },
                    onerror() {
                        reject('Koneksi ke Gemini gagal. Periksa network / key / CORS.');
                    },
                    ontimeout() {
                        reject('Permintaan Gemini timeout.');
                    }
                });
            });
        }
    }

    // ==========================================================
    // 2. CHAT UI (Glassmorphism)
    // ==========================================================
    /**
     * View layer untuk bubble chat.
     * Menangani input, submit, status typing, dan penampilan pesan.
     */
    class ChatUI {
        /**
         * @param {ShadowRoot} shadowRoot - Root tempat UI dipasang.
         */
        constructor(shadowRoot) {
            this.container = document.createElement('div');
            this.container.className = 'chat-container hidden';
            this.container.innerHTML = `
                <div class="chat-header">
                    <span>Shimeji AI ✨</span>
                    <button id="chat-close" type="button" aria-label="Tutup chat">×</button>
                </div>
                <div class="chat-body" id="chat-body"></div>
                <div class="chat-footer">
                    <input id="chat-input" type="text" placeholder="Tanya sesuatu..." autocomplete="off" />
                    <button id="chat-submit" type="button">➔</button>
                </div>
            `;
            shadowRoot.appendChild(this.container);

            this.chatBody = this.container.querySelector('#chat-body');
            this.chatInput = this.container.querySelector('#chat-input');
            this.submitBtn = this.container.querySelector('#chat-submit');
            this.closeBtn = this.container.querySelector('#chat-close');
            this.typingIndicator = null;
            this.isTyping = false;

            this.setupEvents();
        }

        setupEvents() {
            this.submitBtn.addEventListener('click', () => this.handleSend());
            this.closeBtn.addEventListener('click', () => this.close());
            window.addEventListener('resize', () => this.handleViewportChange(), { passive: true });
            this.chatInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    this.handleSend();
                }

                if (event.key === 'Escape') {
                    this.close();
                }
            });
        }

        /**
         * Menutup chat panel tanpa menghapus riwayat percakapan.
         */
        close() {
            this.container.classList.add('hidden');
            this.chatInput.blur();
            if (typeof this.onClose === 'function') {
                this.onClose();
            }
        }

        /**
         * Mengembalikan status apakah panel chat sedang terbuka.
         * @returns {boolean} True jika chat terlihat.
         */
        isOpen() {
            return !this.container.classList.contains('hidden');
        }

        /**
         * Menjaga panel tetap berada di layar setelah perubahan viewport.
         * [EDGE-CASE] Rotasi mobile atau resize desktop dapat membuat posisi awal valid menjadi
         * tidak valid; anchor terakhir dipakai untuk menghitung ulang posisi secara deterministik.
         */
        handleViewportChange() {
            if (this.isOpen() && this.lastAnchor) {
                this.positionWithinViewport(this.lastAnchor.x, this.lastAnchor.y);
            }
        }

        /**
         * Mengatur posisi chat agar seluruh panel tetap berada di dalam viewport.
         * Ukuran aktual digunakan supaya panel tidak terpotong ketika tinggi isi berubah.
         * @param {number} x - Posisi horizontal karakter.
         * @param {number} y - Posisi vertikal karakter.
         */
        positionWithinViewport(x, y) {
            this.lastAnchor = { x, y };
            const panelWidth = this.container.offsetWidth || 300;
            const panelHeight = this.container.offsetHeight || 350;
            const viewportMargin = 12;
            const maxLeft = Math.max(viewportMargin, window.innerWidth - panelWidth - viewportMargin);
            const maxTop = Math.max(viewportMargin, window.innerHeight - panelHeight - viewportMargin);
            const preferredLeft = x + CONFIG.CHARACTER_SIZE + 22;
            const fallbackLeft = x - panelWidth - 22;
            const left = preferredLeft + panelWidth <= window.innerWidth - viewportMargin
                ? preferredLeft
                : fallbackLeft;
            const top = y - 100;

            this.container.style.left = `${Math.min(maxLeft, Math.max(viewportMargin, left))}px`;
            this.container.style.top = `${Math.min(maxTop, Math.max(viewportMargin, top))}px`;
        }

        toggle(x, y) {
            this.container.classList.toggle('hidden');
            if (!this.container.classList.contains('hidden')) {
                this.positionWithinViewport(x, y);
                requestAnimationFrame(() => this.positionWithinViewport(x, y));
                this.chatInput.focus();
            }
        }

        async handleSend() {
            const text = this.chatInput.value.trim().slice(0, CONFIG.MAX_PROMPT_LENGTH);
            if (!text || this.isTyping) {
                return;
            }

            this.addMessage('user', text);
            this.chatInput.value = '';
            this.showTyping();
            if (typeof this.onAnswerStart === 'function') {
                this.onAnswerStart();
            }

            try {
                const reply = await APIConnector.askAI(text);
                this.hideTyping();
                this.addMessage('ai', reply);
            } catch (error) {
                this.hideTyping();
                this.addMessage('ai', `Error: ${error}`);
            } finally {
                if (typeof this.onAnswerEnd === 'function') {
                    this.onAnswerEnd();
                }
            }
        }

        addMessage(role, text) {
            const msg = document.createElement('div');
            msg.className = `msg ${role}`;
            msg.textContent = text;
            this.chatBody.appendChild(msg);

            // [OPTIMIZATION] Memangkas pesan tertua menjaga DOM O(M) tetap berbatas saat sesi panjang;
            // trade-off-nya, riwayat visual paling lama tidak lagi tersedia di panel.
            while (this.chatBody.children.length > CONFIG.MAX_CHAT_MESSAGES) {
                this.chatBody.firstElementChild?.remove();
            }

            this.chatBody.scrollTop = this.chatBody.scrollHeight;
        }

        showTyping() {
            this.isTyping = true;
            this.typingIndicator = document.createElement('div');
            this.typingIndicator.className = 'msg ai typing';
            this.typingIndicator.textContent = 'Mengetik...';
            this.chatBody.appendChild(this.typingIndicator);
            this.chatBody.scrollTop = this.chatBody.scrollHeight;
        }

        hideTyping() {
            this.isTyping = false;
            if (this.typingIndicator) {
                this.typingIndicator.remove();
                this.typingIndicator = null;
            }
        }
    }

    // ==========================================================
    // 3. CHARACTER ANIMATOR (VIEW LAYER)
    // ==========================================================
    // Integrasi penggunaan:
    // - Buat instance di constructor CharacterPhysics.
    // - Panggil this.animator.update(this.state, this.direction, deltaTime) di dalam loop utama.
    // - Jangan memanggil update setiap frame dengan state yang sama tanpa memeriksa deltaTime, karena
    //   itu bisa menyebabkan flicker saat transisi state dan memicu background-position tidak stabil.
    /**
     * Renderer untuk gambar sprite karakter.
     * Menyusun state animation, frame timing, dan flip arah secara efisien.
     */
    class CharacterAnimator {
        /**
         * @param {HTMLElement} hostElement - Elemen karakter yang menampung sprite.
         * @param {Object} animationMap - Peta state ke konfig animasi.
         */
        constructor(hostElement, animationMap) {
            this.hostElement = hostElement;
            this.animationMap = animationMap;
            this.spriteLayer = document.createElement('div');
            this.spriteLayer.className = 'sprite-layer';
            this.hostElement.appendChild(this.spriteLayer);

            this.currentState = 'idle';
            this.direction = 1;
            this.frameIndex = 0;
            this.accumulatedMs = 0;

            this.applyStyle();
            this.update('idle', 1, 0);
        }

        /**
         * Mengatur gaya dasar layer sprite agar rendering stabil di Shadow DOM.
         */
        applyStyle() {
            this.spriteLayer.style.position = 'absolute';
            // [OPTIMIZATION] Sedikit overscan memangkas ruang transparan dari SVG base64 tanpa
            // mengubah data URI; overflow pada host menjaga hasil tetap berada di kotak karakter.
            this.spriteLayer.style.inset = '-4%';
            this.spriteLayer.style.width = '108%';
            this.spriteLayer.style.height = '108%';
            this.spriteLayer.style.backgroundRepeat = 'no-repeat';
            this.spriteLayer.style.backgroundPosition = 'center';
            this.spriteLayer.style.backgroundSize = 'contain';
            this.spriteLayer.style.transformOrigin = 'center center';
            this.spriteLayer.style.willChange = 'background-position, transform';
            this.spriteLayer.style.pointerEvents = 'none';
            this.spriteLayer.style.imageRendering = 'auto';
        }

        /**
         * Menormalisasi alias state agar object map tidak gagal saat state nama berbeda.
         * @param {string} stateName - Nama state seperti walking / walk / falling.
         * @returns {string} Nama state yang konsisten.
         */
        normalizeStateName(stateName) {
            const aliases = {
                walk: 'walking',
                walking: 'walking',
                fall: 'falling',
                falling: 'falling',
                drag: 'dragging',
                dragging: 'dragging',
                climb: 'climbing',
                climbing: 'climbing',
                jump: 'jumping',
                jumping: 'jumping',
                answer: 'answering',
                answering: 'answering',
                descend: 'descending',
                descending: 'descending'
            };
            return aliases[stateName] || stateName || 'idle';
        }

        /**
         * Mengambil konfigurasi state yang valid, termasuk fallback ke idle.
         * @param {string} stateName - Nama state.
         * @returns {Object} Konfigurasi animasi state.
         */
        getStateConfig(stateName) {
            const normalized = this.normalizeStateName(stateName);
            return this.animationMap[normalized] || this.animationMap.idle;
        }

        /**
         * Normalisasi frame layaknya array URL gambar.
         * @param {Object} stateConfig - Konfigurasi state.
         * @returns {string[]} Array path gambar.
         */
        getFramesForState(stateConfig) {
            if (Array.isArray(stateConfig.frames) && stateConfig.frames.length > 0) {
                return stateConfig.frames;
            }
            if (Array.isArray(stateConfig.urls) && stateConfig.urls.length > 0) {
                return stateConfig.urls;
            }
            if (Array.isArray(stateConfig.images) && stateConfig.images.length > 0) {
                return stateConfig.images;
            }
            if (stateConfig.url) {
                return [stateConfig.url];
            }
            return [this.animationMap.idle.url];
        }

        /**
         * Memperbarui sprite sesuai state, arah, dan delta time.
         * @param {string} currentState - State karakter saat ini.
         * @param {number} direction - Arah gerak: -1 kiri, 1 kanan.
         * @param {number} deltaTime - Waktu dari frame sebelumnya dalam ms.
         */
        update(currentState, direction, deltaTime) {
            const normalizedState = this.normalizeStateName(currentState);
            const stateConfig = this.getStateConfig(normalizedState);
            const frames = this.getFramesForState(stateConfig);
            const frameCount = Math.max(1, frames.length);
            const safeTicks = Math.max(1, Number(stateConfig.ticksPerFrame) || 6);

            if (this.currentState !== normalizedState) {
                this.currentState = normalizedState;
                this.frameIndex = 0;
                this.accumulatedMs = 0;
            }

            this.direction = direction === 0 ? this.direction : (direction < 0 ? -1 : 1);
            this.accumulatedMs += deltaTime;

            const frameDurationMs = (safeTicks * 1000) / 60;
            while (this.accumulatedMs >= frameDurationMs) {
                this.accumulatedMs -= frameDurationMs;
                this.frameIndex = (this.frameIndex + 1) % frameCount;
            }

            const frameIndex = Math.min(this.frameIndex, frameCount - 1);
            const activeFrame = frames[frameIndex];

            if (stateConfig.frameWidth && stateConfig.frameHeight) {
                const sheetFrameCount = Math.max(1, Number(stateConfig.frameCount) || frameCount);
                const frameX = Math.min(frameIndex, sheetFrameCount - 1) * stateConfig.frameWidth;
                this.spriteLayer.style.backgroundImage = `url("${activeFrame}")`;
                this.spriteLayer.style.backgroundSize = `${stateConfig.frameWidth * sheetFrameCount}px ${stateConfig.frameHeight}px`;
                this.spriteLayer.style.backgroundPosition = `${-frameX}px 0px`;
            } else {
                this.spriteLayer.style.backgroundImage = `url("${activeFrame}")`;
                this.spriteLayer.style.backgroundSize = 'contain';
                this.spriteLayer.style.backgroundPosition = 'center';
            }

            this.spriteLayer.style.transform = `scale(${CONFIG.SPRITE_SCALE}) scaleX(${this.direction})`;
        }
    }

    // ==========================================================
    // 3. CHARACTER PHYSICS & DOM INTERACTION
    // ==========================================================
    /**
     * Engine fisika karakter.
     * Mengatur posisi, gravitasi, drag, collision, dan aksi random.
     */
    class CharacterPhysics {
        /**
         * @param {ShadowRoot} shadowRoot - Root tempat karakter ditampilkan.
         * @param {ChatUI} chatUI - Chat yang akan dibuka saat double-click.
         */
        constructor(shadowRoot, chatUI) {
            this.element = document.createElement('div');
            this.element.className = 'shimeji state-falling';
            shadowRoot.appendChild(this.element);

            this.chatUI = chatUI;
            this.chatUI.onClose = () => this.endQuestionPause();
            this.chatUI.onAnswerStart = () => this.beginAnswering();
            this.chatUI.onAnswerEnd = () => this.finishAnswering();
            this.width = CONFIG.CHARACTER_SIZE;
            this.height = CONFIG.CHARACTER_SIZE;
            this.x = window.innerWidth / 2 - this.width / 2;
            this.y = -50;
            this.vx = 0;
            this.vy = 0;
            this.state = 'falling';
            this.direction = 1;
            this.isDragging = false;
            this.dragOffsetX = 0;
            this.dragOffsetY = 0;
            this.platforms = [];
            this.lastTime = performance.now();
            this.previousY = this.y;
            this.randomActionTimer = 800;
            this.climbTimer = 0;
            this.autoDirection = 1;
            this.walkDirection = Math.random() < 0.5 ? -1 : 1;
            this.lastPlatformUpdate = 0;
            this.questionPauseTimer = 0;
            this.answerTimer = 0;
            this.isAnswering = false;
            this.stuckTimer = 0;
            this.recoveryCooldown = 0;
            this.lastSampleX = this.x;
            this.lastSampleY = this.y;

            this.animator = new CharacterAnimator(this.element, {
                idle: {
                    url: CONFIG.SPRITE_IDLE,
                    frameWidth: 80,
                    frameHeight: 80,
                    frameCount: 1,
                    ticksPerFrame: 8
                },
                walking: {
                    urls: [
                        CONFIG.SPRITE_IDLE,
                        CONFIG.SPRITE_DRAG,
                        CONFIG.SPRITE_IDLE,
                        CONFIG.SPRITE_CLIMB
                    ],
                    ticksPerFrame: 8
                },
                jumping: {
                    url: CONFIG.SPRITE_JUMP,
                    ticksPerFrame: 8
                },
                answering: {
                    url: CONFIG.SPRITE_TALK,
                    ticksPerFrame: 7
                },
                falling: {
                    url: CONFIG.SPRITE_IDLE,
                    frameWidth: 80,
                    frameHeight: 80,
                    frameCount: 1,
                    ticksPerFrame: 12
                },
                dragging: {
                    url: CONFIG.SPRITE_DRAG,
                    frameWidth: 80,
                    frameHeight: 80,
                    frameCount: 1,
                    ticksPerFrame: 8
                },
                climbing: {
                    url: CONFIG.SPRITE_CLIMB,
                    frameWidth: 80,
                    frameHeight: 80,
                    frameCount: 1,
                    ticksPerFrame: 8
                },
                walk: {
                    urls: [
                        CONFIG.SPRITE_IDLE,
                        CONFIG.SPRITE_DRAG,
                        CONFIG.SPRITE_IDLE,
                        CONFIG.SPRITE_CLIMB
                    ],
                    ticksPerFrame: 8
                },
                fall: {
                    url: CONFIG.SPRITE_IDLE,
                    frameWidth: 80,
                    frameHeight: 80,
                    frameCount: 1,
                    ticksPerFrame: 12
                },
                drag: {
                    url: CONFIG.SPRITE_DRAG,
                    frameWidth: 80,
                    frameHeight: 80,
                    frameCount: 1,
                    ticksPerFrame: 8
                },
                climb: {
                    url: CONFIG.SPRITE_CLIMB,
                    frameWidth: 80,
                    frameHeight: 80,
                    frameCount: 1,
                    ticksPerFrame: 8
                },
                jump: {
                    url: CONFIG.SPRITE_JUMP,
                    ticksPerFrame: 8
                },
                answer: {
                    url: CONFIG.SPRITE_TALK,
                    ticksPerFrame: 7
                },
                descending: {
                    url: CONFIG.SPRITE_CLIMB,
                    ticksPerFrame: 7
                }
            });

            this.setupEvents();
            this.updatePlatforms();
            requestAnimationFrame((time) => this.loop(time));
        }

        setupEvents() {
            this.element.addEventListener('mousedown', (event) => {
                this.isDragging = true;
                this.state = 'dragging';
                this.setState('dragging');
                this.dragOffsetX = event.clientX - this.x;
                this.dragOffsetY = event.clientY - this.y;
                this.vx = 0;
                this.vy = 0;
            });

            window.addEventListener('mousemove', (event) => {
                if (!this.isDragging) {
                    return;
                }

                this.x = event.clientX - this.dragOffsetX;
                this.y = Math.max(0, event.clientY - this.dragOffsetY);
                this.vx = event.movementX * 0.7;
                this.vy = event.movementY * 0.7;
            });

            window.addEventListener('mouseup', () => {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.state = 'falling';
                    this.setState('falling');
                }
            });

            this.element.addEventListener('dblclick', () => {
                this.chatUI.toggle(this.x, this.y);
                if (this.chatUI.isOpen()) {
                    this.beginQuestionPause();
                } else {
                    this.endQuestionPause();
                }
            });
        }

        /**
         * Menghentikan gerak karakter sementara saat user mulai membuka percakapan.
         * Timer tetap membatasi durasi diam agar karakter tidak membeku selamanya.
         */
        beginQuestionPause() {
            this.questionPauseTimer = CONFIG.QUESTION_PAUSE_MS;
            this.vx = 0;
            this.vy = 0;
            this.setState('idle');
        }

        /**
         * Mengakhiri mode mendengarkan dan mengembalikan karakter ke aktivitas normal.
         */
        endQuestionPause() {
            this.questionPauseTimer = 0;
            this.randomActionTimer = 500 + Math.random() * 900;
        }

        /**
         * Memulai mode berbicara ketika request AI sedang diproses.
         * [AUDIT] Mode ini menghentikan velocity, tetapi RAF tetap berjalan agar UI tidak membeku.
         */
        beginAnswering() {
            this.isAnswering = true;
            this.answerTimer = 0;
            this.vx = 0;
            this.vy = 0;
            this.setState('answering');
        }

        /**
         * Menjadwalkan akhir animasi bicara setelah jawaban diterima atau request gagal.
         * [EDGE-CASE] Durasi pendek tetap diberikan setelah response agar jawaban tidak terasa terputus.
         */
        finishAnswering() {
            if (this.isAnswering) {
                this.answerTimer = CONFIG.ANSWER_ANIMATION_MS;
            }
        }

        /**
         * Mengambil semua platform yang layak untuk pijakan atau panjat dari struktur HTML halaman.
         * Filter dibuat lebih cerdas agar karakter tidak memanjat elemen acak seperti ikon, tombol kecil,
         * atau blok yang tidak punya volume visual yang cukup.
         * @returns {Array<Object>} Daftar platform yang sudah difilter dan diurutkan.
         */
        getLogicalPlatforms() {
            const candidateSet = new Set();
            const blockishTags = new Set([
                'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER', 'NAV',
                'UL', 'OL', 'LI', 'P', 'PRE', 'CODE', 'BLOCKQUOTE', 'FORM', 'TABLE', 'TD',
                'TH', 'TR', 'FIGURE', 'FIELDSET', 'LABEL'
            ]);

            Array.from(document.body ? document.body.querySelectorAll('*') : []).forEach((element) => {
                if (!(element instanceof HTMLElement)) {
                    return;
                }

                if (element.closest('#shimeji-ai-host')) {
                    return;
                }

                const tag = element.tagName.toUpperCase();
                if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'CANVAS', 'IMG', 'VIDEO', 'AUDIO', 'INPUT', 'BUTTON'].includes(tag)) {
                    return;
                }

                const style = window.getComputedStyle(element);
                const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.opacity || '1') > 0.05;
                if (!isVisible) {
                    return;
                }

                const rect = element.getBoundingClientRect();
                const width = rect.width;
                const height = rect.height;
                const hasMeaningfulSize = width > 42 && height > 18;
                const hasText = (element.textContent || '').trim().length > 0;
                const isBlockLike = blockishTags.has(tag) || ['block', 'flex', 'grid', 'inline-block', 'table', 'list-item'].includes(style.display);

                if (hasMeaningfulSize && (hasText || isBlockLike)) {
                    candidateSet.add(element);
                }
            });

            return Array.from(candidateSet)
                .map((element) => {
                    const rect = element.getBoundingClientRect();
                    return {
                        element,
                        left: rect.left,
                        right: rect.right,
                        top: rect.top,
                        bottom: rect.bottom,
                        width: rect.width,
                        height: rect.height
                    };
                })
                .filter((platform) => platform.width > 40 && platform.height > 18)
                .sort((a, b) => a.top - b.top);
        }

        /**
         * Mengecek apakah karakter sedang berada di ujung platform yang ada di depannya.
         * Bila mendekati tepi, walker akan berbalik arah agar tidak berjalan ke udara.
         * @param {number} futureX - Posisi x yang akan dicek.
         * @returns {boolean} Apakah sedang dekat tepi.
         */
        isNearPlatformEdge(futureX) {
            const charCenter = futureX + this.width / 2;
            const platform = this.platforms.find((p) => {
                const xRange = charCenter >= p.left && charCenter <= p.right;
                const yRange = this.y + this.height >= p.top - 12 && this.y + this.height <= p.bottom + 18;
                return xRange && yRange;
            });

            if (!platform) {
                return false;
            }

            const margin = 12;
            const nearLeftEdge = this.x + this.width <= platform.left + margin && this.x + this.width >= platform.left - 8;
            const nearRightEdge = this.x >= platform.right - margin && this.x <= platform.right + 8;
            return nearLeftEdge || nearRightEdge;
        }

        /**
         * Mencari platform yang berada di bawah karakter saat ini.
         * @returns {Object|null} Platform aktif atau null bila tidak ada pijakan.
         */
        getGroundPlatform() {
            const feetY = this.y + this.height;

            return this.platforms.find((platform) => {
                const xOverlap = this.x + this.width > platform.left && this.x < platform.right;
                const landingBand = feetY >= platform.top - 12 && feetY <= platform.top + 16;
                const isDescending = this.vy >= 0;
                return xOverlap && landingBand && isDescending;
            }) || null;
        }

        /**
         * Memastikan karakter memiliki permukaan yang lebih rendah sebelum turun.
         * [EDGE-CASE] Tanpa pemeriksaan ini, aksi turun di lantai atau platform terakhir hanya
         * membuat karakter menembus halaman tanpa tujuan. Kompleksitas: O(P).
         * @returns {boolean} True jika platform aktif bukan lantai viewport dan ada ruang turun.
         */
        canDescend() {
            if (!CONFIG.ENABLE_DESCENDING) {
                return false;
            }

            const current = this.getGroundPlatform();
            if (!current || current.top >= window.innerHeight - this.height - 2) {
                return false;
            }

            const hasLowerSurface = this.platforms.some((platform) => {
                const overlapsX = this.x + this.width > platform.left && this.x < platform.right;
                const lowerTop = platform.top > current.top + this.height * 0.35;
                const reachable = platform.top - current.top < this.height * 5;
                return overlapsX && lowerTop && reachable;
            });

            return hasLowerSurface;
        }

        /**
         * Memulai drop-through terkontrol dari platform saat karakter memilih turun.
         * Timer pendek memberi kesempatan melewati platform aktif, setelah itu collision normal
         * kembali mencari pijakan berikutnya. Kompleksitas: O(1).
         */
        beginDescending() {
            this.descendingTimer = CONFIG.DESCENDING_DURATION_MS;
            this.vx = 0;
            this.vy = 1.5;
            this.setState('descending');
        }

        /**
         * Mencari platform yang berada di sisi karakter untuk keperluan climbing.
         * @returns {Object|null} Platform sisi atau null.
         */
        getClimbPlatform() {
            const nearVertical = this.platforms.find((platform) => {
                const horizontalMatch = (this.x + this.width >= platform.left - 8 && this.x + this.width <= platform.left + 18) || (this.x >= platform.right - 18 && this.x <= platform.right + 8);
                const verticalMatch = this.y + this.height > platform.top - 10 && this.y < platform.bottom + 14;
                return horizontalMatch && verticalMatch;
            });

            return nearVertical || null;
        }

        /**
         * Mendeteksi blok yang berada tepat di depan karakter pada ketinggian tubuhnya.
         * [OPTIMIZATION] Pencarian hanya memakai platform yang sudah dicache, sehingga tidak memicu
         * layout read tambahan; kompleksitasnya O(P) dan hanya dipakai ketika karakter berpijak.
         * @returns {Object|null} Penghalang terdekat atau null.
         */
        getObstacleAhead() {
            const direction = this.vx === 0 ? this.walkDirection : Math.sign(this.vx);
            const front = direction > 0 ? this.x + this.width : this.x;
            const feet = this.y + this.height;

            return this.platforms.reduce((nearest, platform) => {
                    const verticalOverlap = this.y + 10 < platform.bottom && feet - 8 > platform.top;
                    const horizontalDistance = direction > 0 ? platform.left - front : front - platform.right;
                    const ahead = horizontalDistance >= -4 && horizontalDistance <= CONFIG.OBSTACLE_LOOKAHEAD_PX;
                    const meaningfulWall = platform.height > this.height * 0.35;
                    if (!verticalOverlap || !ahead || !meaningfulWall) {
                        return nearest;
                    }

                    return !nearest || platform.top < nearest.top ? platform : nearest;
                }, null);
        }

        /**
         * Memulihkan karakter dari kondisi macet memakai sensor posisi dan penghalang lokal.
         * [EDGE-CASE] Cooldown mencegah karakter memantul atau melompat setiap frame di satu titik.
         * Kompleksitas: O(P) untuk obstacle check dan O(1) untuk keputusan recovery.
         * @param {number} dt - Delta waktu frame dalam milidetik.
         */
        updateStuckRecovery(dt) {
            if (this.isDragging || this.isAnswering || this.questionPauseTimer > 0) {
                this.stuckTimer = 0;
                this.recoveryCooldown = Math.max(0, this.recoveryCooldown - dt);
                this.lastSampleX = this.x;
                this.lastSampleY = this.y;
                return;
            }

            this.recoveryCooldown = Math.max(0, this.recoveryCooldown - dt);
            const movedDistance = Math.hypot(this.x - this.lastSampleX, this.y - this.lastSampleY);
            const attemptingMovement = Math.abs(this.vx) > 0.35 || this.state === 'climbing' || this.state === 'jumping' || this.state === 'descending';
            const obstacleAhead = this.state === 'walking' ? this.getObstacleAhead() : null;

            if (obstacleAhead && this.recoveryCooldown <= 0) {
                this.recoverFromObstacle(obstacleAhead);
            } else if (attemptingMovement && movedDistance < CONFIG.STUCK_DISTANCE_PX) {
                this.stuckTimer += dt;
                if (this.stuckTimer >= CONFIG.STUCK_TIMEOUT_MS && this.recoveryCooldown <= 0) {
                    this.recoverFromStuck();
                }
            } else {
                this.stuckTimer = 0;
            }

            this.lastSampleX = this.x;
            this.lastSampleY = this.y;
            this.descendingTimer = 0;
            this.turnCooldown = 0;
        }

        /**
         * Memilih lompatan sebagai respons terhadap penghalang yang dapat dilewati.
         * [AUDIT] Penghalang tinggi tidak dipaksa ditembus; karakter berbalik agar tidak terjebak di wall.
         * @param {Object} obstacle - Platform penghalang di depan karakter.
         */
        recoverFromObstacle(obstacle) {
            const obstacleHeight = obstacle.bottom - this.y;
            this.recoveryCooldown = CONFIG.RECOVERY_COOLDOWN_MS;
            this.stuckTimer = 0;

            if (obstacleHeight < this.height * 1.25 && this.getGroundPlatform()) {
                this.vy = -9.5;
                this.vx = this.walkDirection * 2.2;
                this.setState('jumping');
                return;
            }

            this.walkDirection *= -1;
            this.autoDirection = this.walkDirection;
            this.vx = this.walkDirection * 2.5;
            this.setState('walking');
        }

        /**
         * Memulihkan karakter ketika sensor posisi menunjukkan tidak ada kemajuan.
         * Alternatif dipilih berdasarkan state agar recovery tidak selalu berupa lompatan.
         */
        recoverFromStuck() {
            this.recoveryCooldown = CONFIG.RECOVERY_COOLDOWN_MS;
            this.stuckTimer = 0;

            if (this.state === 'climbing') {
                this.climbTimer = 0;
                this.walkDirection *= -1;
                this.vx = this.walkDirection * 2;
                this.setState('falling');
                return;
            }

            if (this.getGroundPlatform()) {
                this.vy = -9;
                this.vx = this.walkDirection * 2;
                this.setState('jumping');
                return;
            }

            this.walkDirection *= -1;
            this.vx = this.walkDirection * 2;
            this.setState('falling');
        }

        /**
         * Mengambil semua elemen DOM yang layak dijadikan pijakan atau sisi panjat.
         * Filter ini lebih luas daripada sekadar tag tertentu agar karakter mengikuti struktur
         * web yang benar-benar ada di halaman.
         */
        updatePlatforms() {
            this.platforms = this.getLogicalPlatforms();
        }

        setState(newState) {
            if (this.state === newState) {
                return;
            }

            this.state = newState;
            this.element.className = `shimeji state-${newState}`;
        }

        loop(currentTime) {
            // [EDGE-CASE] requestAnimationFrame dapat berhenti ketika tab tidak aktif; membatasi dt
            // mencegah gravitasi dan animasi melompat jauh saat tab kembali terlihat.
            const dt = Math.min(CONFIG.MAX_FRAME_DELTA_MS, Math.max(0, currentTime - this.lastTime));
            this.lastTime = currentTime;

            if (currentTime - this.lastPlatformUpdate > CONFIG.PLATFORM_SCAN_INTERVAL_MS) {
                this.updatePlatforms();
                this.lastPlatformUpdate = currentTime;
            }

            if (!this.isDragging) {
                this.applyPhysics(dt);
                this.updateStuckRecovery(dt);
            }

            this.render(dt);
            requestAnimationFrame((time) => this.loop(time));
        }

        /**
         * Logika utama fisika karakter.
         * Menggabungkan gravitasi, collision dengan elemen DOM, aksi random, dan climbing.
         */
        applyPhysics(dt) {
            // [OPTIMIZATION] Normalize movement to a 60 Hz reference step; otherwise the old
            // per-frame constants made the pet faster and more heavily damped on high-refresh screens.
            const physicsStep = Math.min(2, Math.max(0.5, dt / CONFIG.PHYSICS_REFERENCE_FRAME_MS));
            this.turnCooldown = Math.max(0, this.turnCooldown - dt);

            if (this.isAnswering) {
                this.vx = 0;
                this.vy = 0;
                this.setState('answering');

                if (this.answerTimer > 0) {
                    this.answerTimer -= dt;
                    if (this.answerTimer <= 0) {
                        this.isAnswering = false;
                        this.randomActionTimer = 500 + Math.random() * 900;
                        this.setState('idle');
                    }
                }

                return;
            }

            if (this.descendingTimer > 0) {
                this.descendingTimer -= dt;
                this.vx = 0;
                this.vy = 1.5;
                this.y += 1.5 * physicsStep;
                this.setState('descending');

                if (this.descendingTimer <= 0 || this.y >= window.innerHeight - this.height) {
                    this.descendingTimer = 0;
                    this.setState('falling');
                }

                return;
            }

            if (this.questionPauseTimer > 0) {
                this.questionPauseTimer -= dt;
                this.vx = 0;
                this.vy = 0;
                this.setState('idle');

                if (this.questionPauseTimer <= 0) {
                    this.endQuestionPause();
                    if (this.chatUI.isOpen()) {
                        this.chatUI.close();
                    }
                }

                return;
            }

            this.previousY = this.y;
            this.vy += CONFIG.GRAVITY * physicsStep;
            this.x += this.vx * physicsStep;
            this.y += this.vy * physicsStep;
            this.vx *= Math.pow(CONFIG.FRICTION, physicsStep);
            this.vx = Math.max(-CONFIG.MAX_SPEED, Math.min(CONFIG.MAX_SPEED, this.vx));

            // [EDGE-CASE] Jumping/climbing can move upward indefinitely on short or unusual layouts.
            // Clamping before collision resolution keeps the character visible without teleporting it.
            if (this.y < 0) {
                this.y = 0;
                if (this.vy < 0) {
                    this.vy = 0;
                }
            }

            const floorY = window.innerHeight - this.height;
            const groundPlatform = this.getGroundPlatform();
            const climbPlatform = this.getClimbPlatform();

            let grounded = false;
            let landedPlatform = null;

            if (groundPlatform) {
                this.y = groundPlatform.top - this.height;
                this.vy = 0;
                grounded = true;
                landedPlatform = groundPlatform;
            } else if (this.y > floorY) {
                this.y = floorY;
                this.vy = 0;
                grounded = true;
                landedPlatform = { top: floorY };
            }

            if (climbPlatform && this.state !== 'dragging' && this.state !== 'walking' && this.state !== 'falling' && Math.abs(this.vy) < 2) {
                const nearLeft = this.x + this.width >= climbPlatform.left - CONFIG.PLATFORM_MARGIN && this.x + this.width <= climbPlatform.left + CONFIG.PLATFORM_MARGIN;
                const nearRight = this.x <= climbPlatform.right + CONFIG.PLATFORM_MARGIN && this.x >= climbPlatform.right - CONFIG.PLATFORM_MARGIN;
                if (nearLeft || nearRight) {
                    this.vy = 0;
                    this.x += (nearLeft ? -0.8 : 0.8) * physicsStep;
                    this.y = Math.max(0, this.y - 0.8 * physicsStep);
                    if (this.y === 0) {
                        this.climbTimer = 0;
                        this.setState('idle');
                        return;
                    }
                    this.setState('climbing');
                    return;
                }
            }

            if (this.x < 0) {
                this.x = 0;
                this.vx *= -0.9;
            } else if (this.x > window.innerWidth - this.width) {
                this.x = window.innerWidth - this.width;
                this.vx *= -0.9;
            }

            if (this.climbTimer > 0) {
                this.climbTimer -= dt;
                this.vy = 0;
                this.vx = this.autoDirection * 1.2;
                this.y = Math.max(0, this.y - 1.1 * physicsStep);
                this.setState('climbing');
                if (this.climbTimer <= 0) {
                    this.randomActionTimer = 800 + Math.random() * 1400;
                    this.setState('idle');
                }
                return;
            }

            if (grounded) {
                this.randomActionTimer -= dt;

                if (this.isNearPlatformEdge(this.x + this.vx * physicsStep) && this.turnCooldown <= 0) {
                    this.walkDirection *= -1;
                    this.autoDirection = this.walkDirection;
                    this.turnCooldown = CONFIG.TURN_COOLDOWN_MS;
                }

                const targetWalkSpeed = this.walkDirection * 2.1;
                const steering = Math.min(1, CONFIG.WALK_ACCELERATION * physicsStep);
                this.vx += (targetWalkSpeed - this.vx) * steering;

                if (this.randomActionTimer <= 0) {
                    const actionRoll = Math.random();
                    this.autoDirection = Math.random() < 0.5 ? -1 : 1;
                    this.walkDirection = this.autoDirection;

                    if (actionRoll < 0.45) {
                        this.vx = this.autoDirection * (1.6 + Math.random() * 2.3);
                        this.randomActionTimer = 900 + Math.random() * 1400;
                        this.setState('walking');
                    } else if (actionRoll < 0.72) {
                        this.vy = -9 - Math.random() * 2.8;
                        this.vx = this.autoDirection * (1.3 + Math.random() * 2.0);
                        this.randomActionTimer = 1400 + Math.random() * 2000;
                        grounded = false;
                        this.setState('jumping');
                    } else if (actionRoll < 0.72 + CONFIG.DESCENDING_CHANCE && this.canDescend()) {
                        this.beginDescending();
                        this.randomActionTimer = 1000 + Math.random() * 1600;
                    } else {
                        this.climbTimer = 220 + Math.random() * 500;
                        this.randomActionTimer = 1100 + Math.random() * 1800;
                        this.setState('climbing');
                    }
                }

                if (grounded) {
                    if (Math.abs(this.vx) > 0.6) {
                        this.setState('walking');
                    } else {
                        this.setState('idle');
                    }
                }
            } else if (this.state !== 'climbing' && !(this.state === 'jumping' && this.vy < 0)) {
                this.setState('falling');
            }

            if (landedPlatform && this.state === 'walking' && Math.random() < 0.02) {
                this.vx *= 0.7;
            }
        }

        render(deltaTime = 0) {
            this.direction = this.vx < 0 ? -1 : 1;
            this.animator.update(this.state, this.direction, deltaTime);
            this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
        }
    }

    // ==========================================================
    // 4. MAIN APP BOOTSTRAP & SHADOW DOM
    // ==========================================================
    /**
     * Inisialisasi host Shadow DOM, UI, dan karakter.
     * Dipanggil saat DOM halaman sudah siap.
     */
    function init() {
        // [AUDIT] Satu host per dokumen mencegah dua RAF loop, dua listener global, dan dua request
        // API berjalan bersamaan ketika halaman SPA atau Tampermonkey memanggil bootstrap ulang.
        if (document.getElementById('shimeji-ai-host')) {
            return;
        }

        const host = document.createElement('div');
        host.id = 'shimeji-ai-host';
        host.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 2147483647;';
        document.body.appendChild(host);

        const shadowRoot = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            .shimeji, .chat-container {
                pointer-events: auto;
            }

            .shimeji {
                position: absolute;
                top: 0;
                left: 0;
                width: ${CONFIG.CHARACTER_SIZE}px;
                height: ${CONFIG.CHARACTER_SIZE}px;
                cursor: grab;
                overflow: hidden;
                background: transparent;
                transition: transform 0.05s linear;
                will-change: transform;
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
            }

            .sprite-layer {
                position: absolute;
                inset: 0;
                background-repeat: no-repeat;
                background-position: center;
                background-size: contain;
                image-rendering: auto;
                image-rendering: -webkit-optimize-contrast;
                transform-origin: center center;
                pointer-events: none;
            }

            .shimeji:active {
                cursor: grabbing;
            }

            .state-idle {
                background-image: url('${CONFIG.SPRITE_IDLE}');
            }

            .state-walking {
                animation: bob 0.45s infinite alternate ease-in-out;
            }

            .state-falling {
                background-image: url('${CONFIG.SPRITE_IDLE}');
            }

            .state-dragging {
                background-image: url('${CONFIG.SPRITE_DRAG}');
            }

            .state-climbing {
                background-image: url('${CONFIG.SPRITE_CLIMB}');
            }

            .state-answering {
                animation: answer-pulse 0.36s infinite alternate ease-in-out;
            }

            .state-descending {
                animation: descend-pulse 0.42s infinite alternate ease-in-out;
            }

            @keyframes bob {
                0% {
                    opacity: 1;
                }
                100% {
                    opacity: 0.94;
                }
            }

            @keyframes answer-pulse {
                from {
                    opacity: 0.82;
                    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.22));
                }
                to {
                    opacity: 1;
                    filter: drop-shadow(0 6px 12px rgba(74, 144, 226, 0.5));
                }
            }

            @keyframes descend-pulse {
                from { opacity: 0.86; }
                to { opacity: 1; }
            }

            .chat-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            #chat-close {
                border: 0;
                padding: 0 4px;
                background: transparent;
                color: #ffffff;
                font-size: 22px;
                line-height: 1;
                cursor: pointer;
            }

            #chat-close:hover {
                opacity: 0.75;
            }

            .chat-container {
                position: absolute;
                width: 300px;
                background: rgba(255, 255, 255, 0.18);
                border: 1px solid rgba(255, 255, 255, 0.32);
                border-radius: 16px;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transition: opacity 0.18s ease, transform 0.18s ease;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .chat-container.hidden {
                opacity: 0;
                pointer-events: none;
                transform: scale(0.94);
            }

            .chat-header {
                padding: 12px 14px;
                background: rgba(0, 0, 0, 0.08);
                color: #ffffff;
                font-weight: 700;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
                border-bottom: 1px solid rgba(255, 255, 255, 0.18);
            }

            .chat-body {
                display: flex;
                flex-direction: column;
                gap: 8px;
                height: 250px;
                padding: 12px;
                overflow-y: auto;
            }

            .msg {
                max-width: 80%;
                padding: 8px 12px;
                border-radius: 12px;
                font-size: 14px;
                line-height: 1.4;
                word-wrap: break-word;
            }

            .msg.user {
                align-self: flex-end;
                background: rgba(92, 141, 245, 0.82);
                color: #fff;
                border-bottom-right-radius: 2px;
            }

            .msg.ai {
                align-self: flex-start;
                background: rgba(255, 255, 255, 0.7);
                color: #2c2c2c;
                border-bottom-left-radius: 2px;
            }

            .typing {
                font-style: italic;
                opacity: 0.75;
                animation: pulse 1s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 0.55; }
                50% { opacity: 1; }
            }

            .chat-footer {
                display: flex;
                gap: 8px;
                padding: 10px 12px;
                border-top: 1px solid rgba(255, 255, 255, 0.18);
                background: rgba(0, 0, 0, 0.04);
            }

            #chat-input {
                flex: 1;
                border: none;
                border-radius: 999px;
                padding: 9px 12px;
                background: rgba(255, 255, 255, 0.7);
                outline: none;
                font-size: 14px;
            }

            #chat-submit {
                border: none;
                background: transparent;
                color: #333;
                font-size: 20px;
                cursor: pointer;
                padding: 0 6px;
            }

            #chat-submit:active {
                transform: scale(0.96);
            }

            .chat-body::-webkit-scrollbar {
                width: 6px;
            }

            .chat-body::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.18);
                border-radius: 999px;
            }
        `;

        shadowRoot.appendChild(style);

        const chatUI = new ChatUI(shadowRoot);
        new CharacterPhysics(shadowRoot, chatUI);
    }

    // Jalankan saat DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

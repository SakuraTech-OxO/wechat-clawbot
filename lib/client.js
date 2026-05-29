import { createCipheriv } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_CONFIG } from './config.js';

const createLogger = (level = 'info') => {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[level] || 1;
    return {
        debug: (...args) => currentLevel <= 0 && console.log('[wechat-clawbot][DEBUG]', ...args),
        info: (...args) => currentLevel <= 1 && console.log('[wechat-clawbot][INFO]', ...args),
        warn: (...args) => currentLevel <= 2 && console.warn('[wechat-clawbot][WARN]', ...args),
        error: (...args) => currentLevel <= 3 && console.error('[wechat-clawbot][ERROR]', ...args)
    };
};
class WeChatClient {
    baseUrl;
    cdnBaseUrl;
    apiTimeout;
    longPollTimeout;
    token;
    syncBuf;
    contextToken;
    isRunning;
    messageHandlers;
    errorHandlers;
    sessionExpiredHandlers;
    logger;
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || DEFAULT_CONFIG.base_url;
        this.cdnBaseUrl = options.cdnBaseUrl || DEFAULT_CONFIG.cdn_base_url;
        this.apiTimeout = options.apiTimeout || DEFAULT_CONFIG.api_timeout;
        this.longPollTimeout = options.longPollTimeout || DEFAULT_CONFIG.long_poll_timeout;
        this.token = options.token || null;
        this.syncBuf = '';
        this.contextToken = '';
        this.isRunning = false;
        this.messageHandlers = [];
        this.errorHandlers = [];
        this.sessionExpiredHandlers = [];
        this.logger = options.logger || createLogger();
    }
    buildHeaders(tokenRequired = false) {
        const headers = {
            'Content-Type': 'application/json',
            'AuthorizationType': 'ilink_bot_token',
            'X-WECHAT-UIN': Buffer.from(String(Math.floor(Math.random() * 4294967296))).toString('base64'),
        };
        if (tokenRequired && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }
    async request(method, endpoint, options = {}) {
        let url = `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;
        const headers = { ...this.buildHeaders(options.tokenRequired), ...options.headers };
        const fetchOptions = {
            method,
            headers,
            signal: AbortSignal.timeout(options.timeout || this.apiTimeout),
        };
        if (options.params) {
            const urlObj = new URL(url);
            for (const [key, value] of Object.entries(options.params)) {
                urlObj.searchParams.set(key, String(value));
            }
            url = urlObj.toString();
        }
        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }
        const response = await fetch(url, fetchOptions);
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
        const json = text ? JSON.parse(text) : {};
        if (json && typeof json === 'object') {
            const ret = parseInt(json.ret ?? json.base_info?.ret ?? json.base_response?.ret ?? 0);
            const errcode = parseInt(json.errcode ?? json.base_info?.errcode ?? json.base_response?.errcode ?? 0);
            if (ret !== 0 || errcode !== 0) {
                const errmsg = json.errmsg || json.base_info?.errmsg || json.base_response?.errmsg || 'none';
                throw new Error(`iLink API Error: ret=${ret}, errcode=${errcode}, errmsg=${errmsg}`);
            }
        }
        return json;
    }
    async getQRCode() {
        return this.request('GET', 'ilink/bot/get_bot_qrcode', {
            params: { bot_type: '3' },
            timeout: 15000,
        });
    }
    async pollQRStatus(qrcode) {
        return this.request('GET', 'ilink/bot/get_qrcode_status', {
            params: { qrcode },
            timeout: this.longPollTimeout,
            headers: { 'iLink-App-ClientVersion': '1' },
        });
    }
    async getUpdates(syncBuf) {
        return this.request('POST', 'ilink/bot/getupdates', {
            body: {
                base_info: { channel_version: 'alemonjs' },
                get_updates_buf: syncBuf || '',
            },
            tokenRequired: true,
            timeout: this.longPollTimeout,
        });
    }
    async sendMessage(toUserId, itemList, contextToken) {
        return this.request('POST', 'ilink/bot/sendmessage', {
            body: {
                base_info: { channel_version: 'alemonjs' },
                msg: {
                    from_user_id: '',
                    to_user_id: toUserId,
                    client_id: crypto.randomUUID().replace(/-/g, ''),
                    message_type: 2,
                    message_state: 2,
                    context_token: contextToken,
                    item_list: itemList,
                },
            },
            tokenRequired: true,
        });
    }
    async getUploadUrl(params) {
        return this.request('POST', 'ilink/bot/getuploadurl', {
            body: {
                ...params,
                base_info: { channel_version: 'alemonjs' },
            },
            tokenRequired: true,
        });
    }
    async uploadToCdn(uploadFullUrl, uploadParam, fileKey, aesKeyHex, fileBuffer) {
        const key = Buffer.from(aesKeyHex, 'hex');
        const cipher = createCipheriv('aes-128-ecb', key, null);
        const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
        this.logger.debug('CDN upload:', { rawSize: fileBuffer.length, encryptedSize: encrypted.length, fileKey });
        let url;
        if (uploadFullUrl) {
            url = uploadFullUrl;
        }
        else if (uploadParam) {
            url = `${this.cdnBaseUrl}/upload?encrypted_query_param=${encodeURIComponent(uploadParam)}&filekey=${encodeURIComponent(fileKey)}`;
        }
        else {
            throw new Error('CDN upload URL missing');
        }
        const response = await fetch(url, {
            method: 'POST',
            body: encrypted,
            headers: { 'Content-Type': 'application/octet-stream' },
            signal: AbortSignal.timeout(this.apiTimeout),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`CDN upload failed: ${response.status} ${text}`);
        }
        return response.headers.get('x-encrypted-param') || '';
    }
    onMessage(handler) {
        this.messageHandlers.push(handler);
    }
    onError(handler) {
        this.errorHandlers.push(handler);
    }
    onSessionExpired(handler) {
        this.sessionExpiredHandlers.push(handler);
    }
    async emitMessage(msg) {
        for (const handler of this.messageHandlers) {
            await handler(msg);
        }
    }
    emitError(error) {
        for (const handler of this.errorHandlers) {
            handler(error);
        }
    }
    emitSessionExpired() {
        for (const handler of this.sessionExpiredHandlers) {
            handler();
        }
    }
    async startPolling() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        let errorCount = 0;
        this.logger.info('Starting message polling...');
        while (this.isRunning) {
            try {
                const result = await this.getUpdates(this.syncBuf);
                if (result.get_updates_buf) {
                    this.syncBuf = result.get_updates_buf;
                }
                errorCount = 0;
                const msgs = result.msgs || [];
                if (msgs.length > 0) {
                    this.logger.info(`Received ${msgs.length} message(s)`);
                }
                for (const msg of msgs) {
                    if (!this.isRunning)
                        break;
                    try {
                        await this.emitMessage(msg);
                    }
                    catch (err) {
                        this.logger.error('Error processing message:', err);
                    }
                }
            }
            catch (error) {
                if (error.message?.includes('401') || error.message?.includes('403') ||
                    error.message?.includes('ret=100') || error.message?.includes('invalid token') ||
                    error.message?.includes('errcode=-14') || error.message?.includes('session timeout')) {
                    this.logger.error('Session expired:', error.message);
                    this.emitSessionExpired();
                    return;
                }
                if (error.message?.includes('timeout') || error.name === 'AbortError') {
                    continue;
                }
                errorCount++;
                const sleepTime = Math.min(errorCount * 5000, 300000);
                this.logger.warn(`Polling error (attempt ${errorCount}), retrying in ${sleepTime / 1000}s:`, error.message);
                this.emitError(error);
                await new Promise(resolve => setTimeout(resolve, sleepTime));
            }
        }
        this.logger.info('Message polling stopped');
    }
    stopPolling() {
        this.isRunning = false;
    }
    setCredentials(credentials) {
        this.token = credentials.token;
    }
    getContextToken() {
        return this.contextToken;
    }
    setContextToken(token) {
        this.contextToken = token;
    }
}
class TokenStorage {
    dir;
    fileName;
    constructor(dir) {
        this.dir = dir || DEFAULT_CONFIG.storage_dir;
        this.fileName = 'credentials.json';
    }
    async load() {
        try {
            const raw = await readFile(this.filePath(), 'utf8');
            return JSON.parse(raw);
        }
        catch (err) {
            if (err.code === 'ENOENT')
                return undefined;
            throw err;
        }
    }
    async save(credentials) {
        const { mkdir, writeFile } = await import('node:fs/promises');
        await this.ensureDir();
        await writeFile(this.filePath(), JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600 });
    }
    async delete() {
        const { rm } = await import('node:fs/promises');
        try {
            await rm(this.filePath(), { force: true });
        }
        catch {
        }
    }
    filePath() {
        return path.join(this.dir, this.fileName);
    }
    async ensureDir() {
        const { mkdir } = await import('node:fs/promises');
        await mkdir(this.dir, { recursive: true, mode: 0o700 });
    }
}
class ContextStorage {
    dir;
    constructor(dir) {
        this.dir = dir || DEFAULT_CONFIG.storage_dir;
    }
    async load(botId) {
        try {
            const filePath = this.filePath(botId);
            const raw = await readFile(filePath, 'utf8');
            return JSON.parse(raw);
        }
        catch {
            return { syncBuf: '', contextToken: '' };
        }
    }
    async save(botId, data) {
        const { mkdir, writeFile } = await import('node:fs/promises');
        await this.ensureDir();
        const existing = await this.load(botId);
        const updated = { ...existing, ...data };
        await writeFile(this.filePath(botId), JSON.stringify(updated, null, 2) + '\n', { mode: 0o600 });
    }
    filePath(botId) {
        const safeId = botId.replace(/[^a-zA-Z0-9_-]/g, '_');
        return path.join(this.dir, `context_${safeId}.json`);
    }
    async ensureDir() {
        const { mkdir } = await import('node:fs/promises');
        await mkdir(this.dir, { recursive: true, mode: 0o700 });
    }
}
const displayQRCode = (url) => {
    try {
        import('./qr.js').then(({ default: encodeQR }) => {
            const ascii = encodeQR(url, 'term');
            console.log('\n' + ascii + '\n');
        }).catch(() => {
            console.log('[wechat-clawbot] Please open this URL in browser:', url);
        });
    }
    catch (err) {
        console.error('[wechat-clawbot] Failed to generate QR code:', err);
        console.log('[wechat-clawbot] Please open this URL in browser:', url);
    }
};

export { ContextStorage, TokenStorage, WeChatClient, createLogger, displayQRCode };

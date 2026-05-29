export interface Credentials {
    token: string;
    baseUrl: string;
    accountId: string;
    userId: string;
    nickname?: string;
    savedAt: string;
}
export interface WeChatMessage {
    message_id?: string;
    from_user_id: string;
    from_user_name?: string;
    to_user_id: string;
    context_token: string;
    item_list: any[];
}
export interface WeChatClientOptions {
    baseUrl?: string;
    cdnBaseUrl?: string;
    apiTimeout?: number;
    longPollTimeout?: number;
    token?: string;
    logger?: Logger;
}
export interface Logger {
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
}
export declare const createLogger: (level?: string) => Logger;
export declare class WeChatClient {
    private baseUrl;
    private cdnBaseUrl;
    private apiTimeout;
    private longPollTimeout;
    token: string | null;
    syncBuf: string;
    contextToken: string;
    private isRunning;
    private messageHandlers;
    private errorHandlers;
    private sessionExpiredHandlers;
    private logger;
    constructor(options?: WeChatClientOptions);
    private buildHeaders;
    private request;
    getQRCode(): Promise<any>;
    pollQRStatus(qrcode: string): Promise<any>;
    getUpdates(syncBuf?: string): Promise<any>;
    sendMessage(toUserId: string, itemList: any[], contextToken: string): Promise<any>;
    getUploadUrl(params: any): Promise<any>;
    uploadToCdn(uploadFullUrl: string | undefined, uploadParam: string | undefined, fileKey: string, aesKeyHex: string, fileBuffer: Buffer): Promise<string>;
    onMessage(handler: (msg: WeChatMessage) => Promise<void>): void;
    onError(handler: (error: Error) => void): void;
    onSessionExpired(handler: () => void): void;
    emitMessage(msg: WeChatMessage): Promise<void>;
    private emitError;
    private emitSessionExpired;
    startPolling(): Promise<void>;
    stopPolling(): void;
    setCredentials(credentials: Credentials): void;
    getContextToken(): string;
    setContextToken(token: string): void;
}
export declare class TokenStorage {
    private dir;
    private fileName;
    constructor(dir?: string);
    load(): Promise<Credentials | undefined>;
    save(credentials: Credentials): Promise<void>;
    delete(): Promise<void>;
    private filePath;
    private ensureDir;
}
export declare class ContextStorage {
    private dir;
    constructor(dir?: string);
    load(botId: string): Promise<{
        syncBuf: string;
        contextToken: string;
    }>;
    save(botId: string, data: {
        syncBuf?: string;
        contextToken?: string;
    }): Promise<void>;
    private filePath;
    private ensureDir;
}
export declare const displayQRCode: (url: string) => void;

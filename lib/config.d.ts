export declare const platform = "wechat-clawbot";
export interface WechatConfig {
    base_url?: string;
    cdn_base_url?: string;
    storage_dir?: string;
    log_level?: 'debug' | 'info' | 'warn' | 'error';
    qr_poll_interval?: number;
    api_timeout?: number;
    long_poll_timeout?: number;
    auto_relogin?: boolean;
}
export declare const DEFAULT_CONFIG: Required<WechatConfig>;
export declare const getWechatConfig: () => Required<WechatConfig>;
export declare const getIdentity: (UserId: string) => [boolean, string];
export declare const getMaster: (UserId: string) => [boolean, string];

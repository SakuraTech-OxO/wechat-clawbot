import { getConfigValue, isMaster, createUserHashKey } from 'alemonjs';
import path from 'node:path';
import os from 'node:os';

const platform = 'wechat-clawbot';
const DEFAULT_CONFIG = {
    base_url: 'https://ilinkai.weixin.qq.com',
    cdn_base_url: 'https://novac2c.cdn.weixin.qq.com/c2c',
    storage_dir: path.join(os.homedir(), '.alemonjs-wechat'),
    log_level: 'info',
    qr_poll_interval: 2000,
    api_timeout: 15000,
    long_poll_timeout: 35000,
    auto_relogin: true
};
const getWechatConfig = () => {
    const value = getConfigValue() || {};
    return { ...DEFAULT_CONFIG, ...(value[platform] || {}) };
};
const getIdentity = (UserId) => {
    const isMasterUser = UserId ? isMaster(UserId, platform) : false;
    const UserKey = createUserHashKey({
        Platform: platform,
        UserId
    });
    return [isMasterUser, UserKey];
};
const getMaster = (UserId) => {
    return getIdentity(UserId);
};

export { DEFAULT_CONFIG, getIdentity, getMaster, getWechatConfig, platform };

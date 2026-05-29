import { definePlatform } from 'alemonjs';
import { getWechatConfig } from './config.js';
export { platform } from './config.js';
import { WeChatClient, createLogger } from './client.js';
import { register } from './register.js';

const main = () => {
    const config = getWechatConfig();
    const logger = createLogger(config.log_level);
    const client = new WeChatClient({
        baseUrl: config.base_url,
        cdnBaseUrl: config.cdn_base_url,
        apiTimeout: config.api_timeout,
        longPollTimeout: config.long_poll_timeout,
        logger
    });
    register(client, logger);
};
var index = definePlatform({ main });

export { WeChatClient as API, index as default };

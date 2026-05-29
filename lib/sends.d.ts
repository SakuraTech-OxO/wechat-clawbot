import type { WeChatClient, Logger } from './client.js';
export declare const getFileBuffer: (file: string | Buffer) => Promise<{
    buffer: Buffer;
    fileName: string;
}>;
export declare const detectMediaType: (fileName: string, buffer: Buffer) => {
    mediaType: number;
    itemType: number;
};
export declare const uploadMedia: (client: WeChatClient, file: string | Buffer, toUserId: string, logger: Logger) => Promise<any>;
export declare const formatToItemList: (val: any[], toUserId: string, client: WeChatClient, logger: Logger) => Promise<any[]>;
export declare const SEND_MESSAGE: (client: WeChatClient, userId: string, val: any[], logger: Logger) => Promise<any[]>;

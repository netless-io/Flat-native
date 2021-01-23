import { makeAutoObservable, toJS, reaction } from "mobx";
import { mergeConfig } from "./utils";

export interface WechatInfo {
    avatar: string;
    name: string;
    token: string;
}

/**
 * Properties in Global Store are persisted and shared globally.
 */
export class GlobalStore {
    wechat: WechatInfo | null = null;
    userUUID: string | null = null;
    whiteboardRoomUUID: string | null = null;
    whiteboardRoomToken: string | null = null;
    rtcToken: string | null = null;
    rtmToken: string | null = null;

    constructor() {
        mergeConfig(this, getLSGlobalStore());
        makeAutoObservable(this);
        reaction(
            () => toJS(this),
            store => setLSGlobalStore(store),
        );
    }

    updateUserUUID = (userUUID: string): void => {
        this.userUUID = userUUID;
    };

    updateWechat = (wechatInfo: WechatInfo): void => {
        this.wechat = wechatInfo;
    };

    updateToken = (
        config: Pick<
            GlobalStore,
            "whiteboardRoomUUID" | "whiteboardRoomToken" | "rtcToken" | "rtmToken"
        >,
    ): void => {
        mergeConfig(this, config);
    };
}

export const globalStore = new GlobalStore();

function getLSGlobalStore(): null | GlobalStore {
    try {
        const str = localStorage.getItem("GlobalStore");
        return str ? JSON.parse(str) : null;
    } catch (e) {
        return null;
    }
}

function setLSGlobalStore(globalStore: GlobalStore): void {
    localStorage.setItem("GlobalStore", JSON.stringify(globalStore));
}

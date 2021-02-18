import * as runtime from "./runtime";

export type ActionAsync = {
    "set-win-size": (args: { width: number; height: number; autoCenter?: boolean }) => void;
    "set-open-at-login": (args: { isOpenAtLogin: boolean }) => void;
    "set-close-window": (args: { close: boolean }) => void;
    "set-title": (args: { title: string }) => void;
};

export type ActionSync = {
    "get-runtime": () => runtime.Type;
    "get-open-at-login": () => boolean;
};

export interface EmitEvents {
    "window-will-close": {};
}

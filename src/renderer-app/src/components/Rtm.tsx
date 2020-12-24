import React from "react";
import { RouteComponentProps } from "react-router";
import { v4 as uuidv4 } from "uuid";
import dateSub from "date-fns/sub";
import memoizeOne from "memoize-one";
import {
    Rtm as RtmApi,
    RTMessage,
    RTMessageText,
    RTMessageType,
    RTMRawMessage,
} from "../apiMiddleware/Rtm";
import { generateAvatar } from "../utils/generateAvatar";
import { Identity } from "../utils/localStorage/room";
import { ChatMessageItem } from "./ChatPanel/ChatMessage";
import { RTMUser } from "./ChatPanel/ChatUser";

export interface RtmRenderProps extends RtmState {
    rtm: RtmApi;
    handRaisingCount: number;
    updateHistory: () => Promise<void>;
    onMessageSend: (text: string) => Promise<void>;
    onCancelAllHandRaising: () => void;
    onToggleHandRaising: () => void;
    onToggleBan: () => void;
    onJoinerSpeak: (uid: string, speak: boolean) => void;
    bindOnSpeak: (onSpeak: (uid: string, speak: boolean) => void) => void;
}

export interface RtmProps {
    children: (props: RtmRenderProps) => React.ReactNode;
    roomId: string;
    userId: string;
    identity: Identity;
}

export type RtmState = {
    messages: ChatMessageItem[];
    users: RTMUser[];
    creatorId: string | null;
    currentUser: RTMUser | null;
    isBan: boolean;
};

export class Rtm extends React.Component<RtmProps, RtmState> {
    private rtm = new RtmApi();
    private noMoreRemoteMessages = false;

    state: RtmState = {
        messages: [],
        users: [],
        creatorId: this.props.identity === Identity.creator ? this.props.userId : null,
        currentUser: null,
        isBan: false,
    };

    async componentDidMount() {
        const { userId, roomId, identity } = this.props;
        const channel = await this.rtm.init(userId, roomId);
        channel.on("ChannelMessage", (msg, senderId) => {
            if (msg.messageType === RtmApi.MessageType.TEXT) {
                this.handleChannelMessage(msg.text, senderId);
            }
        });

        // @TODO 使用我们自己的服务器记录类型
        if (identity === Identity.creator) {
            this.rtm.client.addOrUpdateChannelAttributes(
                roomId,
                { creatorId: userId },
                { enableNotificationToChannelMembers: true },
            );
        } else {
            channel.on("AttributesUpdated", this.updateChannelAttrs);
            this.updateChannelAttrs(await this.rtm.client.getChannelAttributes(roomId));
        }

        this.updateHistory();

        const members = await channel.getMembers();
        this.setState(
            () => ({
                users: members.map(uid => ({
                    id: uid,
                    // @TODO 等待登陆系统接入
                    avatar: generateAvatar(uid),
                    name: "",
                })),
            }),
            () => {
                this.updateUsers();
            },
        );
        channel.on("MemberJoined", uid => {
            this.setState(
                state =>
                    state.users.some(user => user.id === uid)
                        ? null
                        : {
                              users: [
                                  ...state.users,
                                  {
                                      id: uid,
                                      // @TODO 等待登陆系统接入
                                      avatar: generateAvatar(uid),
                                      name: "",
                                  },
                              ],
                          },
                () => {
                    this.updateUsers();
                },
            );
        });
        channel.on("MemberLeft", uid => {
            this.setState(state => ({
                users: state.users.filter(user => user.id !== uid),
            }));
        });
    }

    componentWillUnmount() {
        this.rtm.destroy();
    }

    render(): React.ReactNode {
        return this.props.children({
            ...this.state,
            rtm: this.rtm,
            handRaisingCount: this.handRaisingCountMemo(this.state.users),
            updateHistory: this.updateHistory,
            onMessageSend: this.onMessageSend,
            onCancelAllHandRaising: this.onCancelAllHandRaising,
            onToggleHandRaising: this.onToggleHandRaising,
            onToggleBan: this.onToggleBan,
            onJoinerSpeak: this.onJoinerSpeak,
            bindOnSpeak: this.bindOnSpeak,
        });
    }

    onSpeak = (_uid: string, _speak: boolean): void => {
        throw new Error("onSpeak is not set!");
    };

    private bindOnSpeak = (onSpeak: (uid: string, speak: boolean) => void): void => {
        this.onSpeak = onSpeak;
    };

    private onMessageSend = async (text: string): Promise<void> => {
        if (this.state.isBan && this.props.identity !== Identity.creator) {
            return;
        }
        await this.rtm.sendMessage({ t: RTMessageType.Text, v: text });
        this.addMessage(RTMessageType.Text, text, this.props.userId);
    };

    private onCancelAllHandRaising = (): void => {
        this.cancelAllHandRaising();
        this.rtm.sendMessage({ t: RTMessageType.CancelHandRaising });
    };

    private onJoinerSpeak = (uid: string, speak: boolean): void => {
        this.updateUsers(
            user => user.id === uid,
            user => ({
                ...user,
                isSpeaking: speak,
                isRaiseHand: false,
            }),
            () => {
                this.onSpeak(uid, speak);
                this.rtm.sendMessage({
                    t: RTMessageType.Speak,
                    v: { uid, speak },
                });
            },
        );
    };

    private onToggleBan = (): void => {
        const { identity, userId } = this.props;
        if (identity !== Identity.creator) {
            return;
        }
        this.setState(
            state => ({
                isBan: !state.isBan,
                messages: [
                    ...state.messages,
                    {
                        type: RTMessageType.Ban,
                        uuid: uuidv4(),
                        timestamp: Date.now(),
                        value: !state.isBan,
                        userId,
                    },
                ],
            }),
            () => {
                this.rtm.sendMessage({ t: RTMessageType.Ban, v: this.state.isBan });
            },
        );
    };

    // Current user (who is a joiner) raises hand
    private onToggleHandRaising = (): void => {
        const { userId, identity } = this.props;
        const { currentUser } = this.state;
        if (identity !== Identity.joiner || currentUser?.isSpeaking) {
            return;
        }
        this.updateUsers(
            user => user.id === userId,
            user => ({
                ...user,
                isRaiseHand: !user.isRaiseHand,
            }),
            () => {
                const { currentUser } = this.state;
                if (currentUser) {
                    this.rtm.sendMessage({
                        t: RTMessageType.RaiseHand,
                        v: !!currentUser.isRaiseHand,
                    });
                }
            },
        );
    };

    /** Add the new message to message list */
    private addMessage = (
        type: RTMessageType.Text | RTMessageType.Notice,
        value: string,
        senderId: string,
    ): void => {
        this.setState(state => {
            const timestamp = Date.now();
            const messages = [...state.messages];
            let insertPoint = 0;
            while (insertPoint < messages.length && messages[insertPoint].timestamp <= timestamp) {
                insertPoint++;
            }
            messages.splice(insertPoint, 0, {
                type,
                uuid: uuidv4(),
                timestamp,
                value,
                userId: senderId,
            });
            return { messages };
        });
    };

    private cancelAllHandRaising = (): void => {
        this.updateUsers(
            user => !!user.isRaiseHand,
            user => ({
                ...user,
                isRaiseHand: false,
            }),
        );
    };

    /** show the calcel hand raising button */
    private handRaisingCountMemo = memoizeOne((users: RTMUser[]): number => {
        let count = 0;
        for (const user of users) {
            if (user.isRaiseHand) {
                count += 1;
            }
        }
        return count;
    });

    private handleChannelMessage = (rawText: string, senderId: string): void => {
        const { identity, userId } = this.props;
        const parsedMessage: RTMRawMessage = {
            t: RTMessageType.Text as RTMessageType,
            v: rawText as any,
        };

        try {
            const m = JSON.parse(rawText);
            if (m.t !== undefined) {
                parsedMessage.t = m.t;
                parsedMessage.v = m.v;
            }
        } catch (e) {
            // ignore legacy type
        }

        switch (parsedMessage.t) {
            case RTMessageType.Text: {
                this.addMessage(RTMessageType.Text, parsedMessage.v, senderId);
                break;
            }
            case RTMessageType.CancelHandRaising: {
                if (senderId === this.state.creatorId && identity === Identity.joiner) {
                    this.cancelAllHandRaising();
                }
                break;
            }
            case RTMessageType.RaiseHand: {
                this.updateUsers(
                    user => user.id === senderId,
                    user => ({
                        ...user,
                        isRaiseHand: parsedMessage.v,
                    }),
                );
                break;
            }
            case RTMessageType.Ban: {
                if (identity === Identity.joiner) {
                    this.setState(state => ({
                        isBan: parsedMessage.v,
                        messages: [
                            ...state.messages,
                            {
                                type: RTMessageType.Ban,
                                uuid: uuidv4(),
                                timestamp: Date.now(),
                                value: parsedMessage.v,
                                userId,
                            },
                        ],
                    }));
                }
                break;
            }
            case RTMessageType.Speak: {
                if (senderId === this.state.creatorId) {
                    const { uid, speak } = parsedMessage.v;
                    this.updateUsers(
                        user => user.id === uid,
                        user => ({
                            ...user,
                            isSpeaking: speak,
                            isRaiseHand: false,
                        }),
                        () => {
                            this.onSpeak(uid, speak);
                        },
                    );
                }
                break;
            }
            case RTMessageType.Notice: {
                this.addMessage(RTMessageType.Notice, parsedMessage.v, senderId);
                break;
            }
            default:
                break;
        }
    };

    private updateHistory = async (): Promise<void> => {
        if (this.noMoreRemoteMessages) {
            return;
        }

        let messages: RTMessage[] = [];

        try {
            const oldestTimestap = this.state.messages[0]?.timestamp || Date.now();
            messages = await this.rtm.fetchHistory(
                dateSub(oldestTimestap, { years: 1 }).valueOf(),
                oldestTimestap - 1,
            );
        } catch (e) {
            console.warn(e);
        }

        if (messages.length <= 0) {
            this.noMoreRemoteMessages = true;
            return;
        }

        const textMessages = messages.filter(
            (message): message is RTMessageText =>
                message.type === RTMessageType.Text || message.type === RTMessageType.Notice,
        );

        this.setState(state => ({ messages: [...textMessages, ...state.messages] }));
    };

    private updateChannelAttrs = (attrs: { [index: string]: { value: string } }): void => {
        if (attrs.creatorId?.value !== undefined) {
            const creatorId = attrs.creatorId.value;
            this.setState({ creatorId }, () => {
                this.updateUsers();
            });
        }
    };

    private updateUsers(): void;
    private updateUsers(
        shouldChange: (user: RTMUser) => boolean,
        updateUser: (user: RTMUser, state: RtmState) => RTMUser,
        setStateCallback?: () => void,
    ): void;
    private updateUsers(
        shouldChange?: (user: RTMUser) => boolean,
        updateUser?: (user: RTMUser, state: RtmState) => RTMUser,
        setStateCallback?: () => void,
    ): void {
        this.setState(state => {
            const { users, creatorId } = state;
            const { userId } = this.props;
            const speakingUsers: RTMUser[] = [];
            const raiseHandUsers: RTMUser[] = [];
            const middle: RTMUser[] = [];
            const newUsers: RTMUser[] = [];
            let currentUser: RTMUser | null = null;

            let hasUpdate = false;

            for (let user of users) {
                if (shouldChange && shouldChange(user)) {
                    const newUser = updateUser!(user, state);
                    if (user !== newUser) {
                        hasUpdate = true;
                        user = newUser;
                    }
                }

                const isCurrentUser = user.id === userId;
                if (isCurrentUser) {
                    currentUser = user;
                }

                if (user.isSpeaking) {
                    speakingUsers.push(user);
                } else if (user.isRaiseHand) {
                    raiseHandUsers.push(user);
                } else if (user.id === creatorId) {
                    if (middle.length < 0 || user !== middle[0]) {
                        middle.unshift(user);
                    }
                } else if (isCurrentUser) {
                    if (middle.length < 0 || user !== middle[0]) {
                        middle.push(user);
                    }
                } else {
                    newUsers.push(user);
                }
            }

            if (!shouldChange || hasUpdate) {
                return {
                    users: [...speakingUsers, ...raiseHandUsers, ...middle, ...newUsers],
                    currentUser,
                };
            }

            return null;
        }, setStateCallback);
    }
}

export type WithRtmRouteProps = { rtm: RtmRenderProps } & RouteComponentProps<{
    identity: Identity;
    uuid: string;
    userId: string;
}>;

export function withRtmRoute<Props>(Comp: React.ComponentType<Props & WithRtmRouteProps>) {
    return class WithRtmRoute extends React.Component<
        Props & Omit<WithRtmRouteProps, "whiteboard">
    > {
        render() {
            const { uuid, userId, identity } = this.props.match.params;
            return (
                <Rtm roomId={uuid} userId={userId} identity={identity}>
                    {this.renderChildren}
                </Rtm>
            );
        }

        renderChildren = (props: RtmRenderProps) => <Comp {...this.props} rtm={props} />;
    };
}

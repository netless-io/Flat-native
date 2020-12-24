import React from "react";
import { RouteComponentProps } from "react-router";
import logo from "./assets/image/logo.svg";
import { Button, Input } from "antd";
import { Link } from "react-router-dom";
import { netlessWhiteboardApi } from "./apiMiddleware";
import { ipcAsyncByMain } from "./utils/ipc";
import { saveRoom, Identity } from "./utils/localStorage/room";

export type JoinPageStates = {
    roomName: string;
    userName: string;
    value: boolean;
};

export default class CreatePage extends React.Component<RouteComponentProps, JoinPageStates> {
    public constructor(props: RouteComponentProps) {
        super(props);
        this.state = {
            roomName: "",
            userName: "",
            value: false,
        };
        ipcAsyncByMain("set-win-size", {
            width: 480,
            height: 480,
        });
    }

    private createRoomAndGetUuid = async (room: string, limit: number): Promise<string | null> => {
        const res = await netlessWhiteboardApi.room.createRoomApi(room, limit);
        if (res.uuid) {
            return res.uuid;
        } else {
            return null;
        }
    };

    private handleJoin = async (): Promise<void> => {
        const userId = `${Math.floor(Math.random() * 100000)}`;
        const uuid = await this.createRoomAndGetUuid(this.state.roomName, 0);
        if (uuid) {
            saveRoom({
                uuid,
                userId,
                identity: Identity.creator,
                roomName: this.state.roomName,
            });
            this.props.history.push(`/whiteboard/${Identity.creator}/${uuid}/${userId}/`);
        }
    };

    public render(): React.ReactNode {
        const { roomName, userName } = this.state;
        return (
            <div className="page-index-box">
                <div className="page-index-mid-box">
                    <div className="page-index-logo-box">
                        <img src={logo} alt={"logo"} />
                    </div>
                    <div className="page-index-form-box">
                        <span>房间主题</span>
                        <Input
                            placeholder={"输入房间主题"}
                            value={roomName}
                            style={{ marginBottom: 28, width: 384 }}
                            onChange={evt => this.setState({ roomName: evt.target.value })}
                            size={"large"}
                        />
                        <span>昵称</span>
                        <Input
                            placeholder={"请输入昵称"}
                            value={userName}
                            style={{ marginBottom: 28, width: 384 }}
                            onChange={evt => this.setState({ userName: evt.target.value })}
                            size={"large"}
                        />
                        <div className="page-index-btn-box">
                            <Link to={"/"}>
                                <Button className="page-index-btn" size={"large"}>
                                    返回首页
                                </Button>
                            </Link>
                            <Button
                                className="page-index-btn"
                                disabled={roomName === ""}
                                size={"large"}
                                onClick={this.handleJoin}
                                type={"primary"}
                            >
                                创建房间
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

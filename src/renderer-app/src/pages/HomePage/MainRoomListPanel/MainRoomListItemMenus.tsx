import { Menu } from "antd";
import { MenuProps } from "antd/lib/menu";
import React, { useContext } from "react";
import { CopyInvitationItem } from "../../../components/MoreMenu/CopyInvitationItem";
import { DeleteRoomHistoryItem } from "../../../components/MoreMenu/DeleteRoomHistoryItem";
import { ModifyRoomItem } from "../../../components/MoreMenu/ModifyRoomItem";
import { RemoveRoomItem } from "../../../components/MoreMenu/RemoveRoomItem";
import { RoomDetailsItem } from "../../../components/MoreMenu/RoomDetailsItem";
import { RoomStoreContext } from "../../../components/StoreProvider";
import { globalStore } from "../../../stores/GlobalStore";

export interface MainRoomListItemMenusProps extends MenuProps {
    roomUUID: string;
    periodicUUID?: string;
    isHistoryList: boolean;
    ownerUUID: string;
    onRemoveRoom?: (roomUUID?: string) => void;
}

export const MainRoomListItemMenus = React.memo<MainRoomListItemMenusProps>(
    function MainRoomListItemMenus({
        roomUUID,
        periodicUUID,
        isHistoryList,
        ownerUUID,
        onRemoveRoom,
        ...restProps
    }) {
        const roomStore = useContext(RoomStoreContext);

        const roomInfo = roomStore.rooms.get(roomUUID);

        const isCreator = ownerUUID === globalStore.userUUID;

        return (
            // pass down props so that antd dropdown menu shadow is rendered properly
            <>
                <Menu {...restProps}>
                    <RoomDetailsItem room={roomInfo} />
                    {isHistoryList ? (
                        <DeleteRoomHistoryItem room={roomInfo} onRemoveRoom={onRemoveRoom} />
                    ) : (
                        <>
                            <ModifyRoomItem room={roomInfo} isCreator={isCreator} />
                            <RemoveRoomItem
                                onRemoveRoom={onRemoveRoom}
                                room={roomInfo}
                                isCreator={isCreator}
                                isPeriodicDetailsPage={false}
                            />
                            <CopyInvitationItem room={roomInfo} />
                        </>
                    )}
                </Menu>
            </>
        );
    },
);

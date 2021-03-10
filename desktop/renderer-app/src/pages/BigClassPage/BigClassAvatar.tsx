import React from "react";
import { Observer, observer } from "mobx-react-lite";
import classNames from "classnames";
import { VideoAvatar, VideoAvatarProps } from "../../components/VideoAvatar";

import noCamera from "../../assets/image/no-camera.svg";
import noCameraSmall from "../../assets/image/no-camera-small.svg";
import videoExpand from "../../assets/image/video-expand.svg";

import "./BigClassAvatar.less";

export interface BigClassAvatarProps extends Omit<VideoAvatarProps, "children"> {
    small?: boolean;
    onExpand?: () => void;
}

export const BigClassAvatar = observer<BigClassAvatarProps>(function BigClassAvatar({
    avatarUser,
    small,
    onExpand,
    ...restProps
}) {
    return (
        <VideoAvatar {...restProps} avatarUser={avatarUser}>
            {(canvas, ctrlBtns) => (
                <Observer>
                    {() => (
                        <section
                            className={classNames("big-class-avatar-wrap", { "is-small": small })}
                        >
                            {canvas}
                            {!avatarUser.camera && (
                                <div className="big-class-avatar-background">
                                    <img src={small ? noCameraSmall : noCamera} alt="no camera" />
                                </div>
                            )}
                            <div
                                className={classNames("big-class-avatar-ctrl-layer", {
                                    "with-video": avatarUser.camera,
                                })}
                            >
                                {small ? (
                                    <button className="big-class-avatar-expand" onClick={onExpand}>
                                        <img src={videoExpand} alt="expand" />
                                    </button>
                                ) : (
                                    <>
                                        <h1 className="big-class-avatar-title">
                                            {avatarUser.name}
                                        </h1>
                                        {ctrlBtns}
                                    </>
                                )}
                            </div>
                        </section>
                    )}
                </Observer>
            )}
        </VideoAvatar>
    );
});

export default BigClassAvatar;

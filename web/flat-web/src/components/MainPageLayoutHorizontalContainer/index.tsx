/* eslint-disable react/display-name */
// import deviceSVG from "./icons/device.svg";
// import deviceActiveSVG from "./icons/device-active.svg";
import settingSVG from "./icons/setting.svg";
import gitHubSVG from "./icons/github.svg";
import feedbackSVG from "./icons/feedback.svg";
import logoutSVG from "./icons/logout.svg";

import React, { useContext } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { MainPageLayoutHorizontal, MainPageLayoutItem, MainPageLayoutProps } from "flat-components";
import { routeConfig, RouteNameType } from "../../route-config";
import { GlobalStoreContext } from "../StoreProvider";
import { useTranslation } from "react-i18next";

export interface MainPageLayoutHorizontalContainerProps {
    subMenu?: MainPageLayoutItem[];
    activeKeys?: string[];
    onRouteChange?: MainPageLayoutProps["onClick"];
    title?: React.ReactNode;
    onBackPreviousPage?: () => void;
}

export const MainPageLayoutHorizontalContainer: React.FC<MainPageLayoutHorizontalContainerProps> =
    ({ subMenu, children, activeKeys, onRouteChange, title, onBackPreviousPage }) => {
        const { t } = useTranslation();
        const leftMenu = [
            {
                key: routeConfig[RouteNameType.HomePage].path,
                icon: (active: boolean): React.ReactNode => <></>,
                title: t("home"),
                route: routeConfig[RouteNameType.HomePage].path,
            },
            {
                key: routeConfig[RouteNameType.CloudStoragePage].path,
                icon: (active: boolean): React.ReactNode => <></>,
                title: t("cloud-storage"),
                route: routeConfig[RouteNameType.CloudStoragePage].path,
            },
        ];

        const rightMenu: MainPageLayoutItem[] = [
            // {
            //     key: "deviceCheck",
            //     icon: (active: boolean): React.ReactNode => (
            //         <img src={active ? deviceActiveSVG : deviceSVG} />
            //     ),
            //     title: "deviceCheck",
            //     route: routeConfig[RouteNameType.SystemCheckPage].path,
            // },
        ];

        const popMenu = [
            {
                key: routeConfig[RouteNameType.GeneralSettingPage].path,
                icon: (): React.ReactNode => <img src={settingSVG} />,
                title: t("settings"),
                route: routeConfig[RouteNameType.GeneralSettingPage].path,
            },
            {
                key: "getGitHubCode",
                icon: (): React.ReactNode => <img src={gitHubSVG} />,
                title: t("source-code"),
                route: "https://github.com/netless-io/flat/",
            },
            {
                key: "feedback",
                icon: (): React.ReactNode => <img src={feedbackSVG} />,
                title: t("feedback"),
                route: "https://github.com/netless-io/flat/issues",
            },
            {
                key: "logout",
                icon: (): React.ReactNode => <img src={logoutSVG} />,
                title: (
                    <span className="logout-title" onClick={() => localStorage.clear()}>
                        {t("logout")}
                    </span>
                ),
                route: routeConfig[RouteNameType.LoginPage].path,
            },
        ];

        const location = useLocation();

        activeKeys ??= [location.pathname];

        const history = useHistory();

        const globalStore = useContext(GlobalStoreContext);

        const historyPush = (mainPageLayoutItem: MainPageLayoutItem): void => {
            if (mainPageLayoutItem.route.startsWith("/")) {
                onRouteChange
                    ? onRouteChange(mainPageLayoutItem)
                    : history.push(mainPageLayoutItem.route);
            } else {
                void window.open(mainPageLayoutItem.route);
            }
        };

        return (
            <MainPageLayoutHorizontal
                title={title}
                onBackPreviousPage={onBackPreviousPage}
                leftMenu={leftMenu}
                rightMenu={rightMenu}
                popMenu={popMenu}
                subMenu={subMenu}
                onClick={historyPush}
                activeKeys={activeKeys}
                avatarSrc={globalStore.userInfo?.avatar ?? ""}
                userName={globalStore.userInfo?.name ?? ""}
            >
                {children}
            </MainPageLayoutHorizontal>
        );
    };

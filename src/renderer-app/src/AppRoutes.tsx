import React from "react";
import { HashRouter } from "react-router-dom";
import { Route, Switch } from "react-router";
import { message } from "antd";
import { LastLocationProvider } from "react-router-last-location";
import { RouteConfig, routeConfig } from "./route-config";
import { ipcAsyncByMain } from "./utils/ipc";

export class AppRoutes extends React.Component {
    public componentDidCatch(error: any): void {
        message.error(`网页加载发生错误：${error}`);
    }

    public render(): React.ReactElement {
        return (
            <HashRouter>
                <LastLocationProvider watchOnlyPathname>
                    <Switch>
                        {Object.keys(routeConfig).map(((name: keyof RouteConfig) => {
                            const { path, component, title } = routeConfig[name];
                            return (
                                <Route
                                    key={name}
                                    exact={true}
                                    path={path}
                                    render={routeProps => {
                                        const Comp = component as React.ComponentType<any>;
                                        const compName = Comp.displayName || Comp.name;
                                        document.title =
                                            title +
                                            (process.env.NODE_ENV === "development" && compName
                                                ? ` (${compName})`
                                                : "");
                                        ipcAsyncByMain("set-title", {
                                            title: document.title,
                                        });
                                        return <Comp {...routeProps} />;
                                    }}
                                />
                            );
                        }) as (name: string) => React.ReactElement)}
                    </Switch>
                </LastLocationProvider>
            </HashRouter>
        );
    }
}

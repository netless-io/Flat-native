import { setAuthUUID, loginProcess } from "../../apiMiddleware/flatServer";
import { v4 as uuidv4 } from "uuid";
import { LoginExecutor } from "./utils";
import { errorTips } from "../../components/Tips/ErrorTips";
import { FLAT_SERVER_LOGIN } from "../../apiMiddleware/flatServer/constants";
import { GITHUB } from "../../constants/Process";

export const githubLogin: LoginExecutor = onSuccess => {
    let timer = NaN;
    const authUUID = uuidv4();

    function getGithubURL(authUUID: string): string {
        const redirectURL = FLAT_SERVER_LOGIN.GITHUB_CALLBACK;
        return `https://github.com/login/oauth/authorize?client_id=${GITHUB.CLIENT_ID}&redirect_uri=${redirectURL}&state=${authUUID}`;
    }

    void (async () => {
        try {
            await setAuthUUID(authUUID);
        } catch (err) {
            errorTips(err);
        }

        void window.open(getGithubURL(authUUID));

        const githubLoginProcessRequest = async (): Promise<void> => {
            try {
                const data = await loginProcess(authUUID);

                if (!data.name) {
                    timer = window.setTimeout(githubLoginProcessRequest, 2000);
                    return;
                }

                onSuccess(data);
            } catch (err) {
                errorTips(err);
            }
        };

        void githubLoginProcessRequest();
    })();

    return () => {
        window.clearTimeout(timer);
    };
};

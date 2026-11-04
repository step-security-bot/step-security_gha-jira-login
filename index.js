const core = require("@actions/core");
const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const fs = require("fs");
const os = require("os");
const path = require("path");
const yaml = require("yaml");

async function validateSubscription() {
    let repoPrivate;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (eventPath && fs.existsSync(eventPath)) {
        const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
        repoPrivate = payload?.repository?.private;
    }

    const upstream = "frieder/gha-jira-login";
    const action = process.env.GITHUB_ACTION_REPOSITORY;
    const docsUrl = "https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions";
    core.info("");
    core.info("\u001b[1;36mStepSecurity Maintained Action\u001b[0m");
    core.info(`Secure drop-in replacement for ${upstream}`);
    if (repoPrivate === false) core.info("\u001b[32m\u2713 Free for public repositories\u001b[0m");
    core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
    core.info("");
    if (repoPrivate === false) return;
    const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
    const body = { action: action || "" };
    if (serverUrl !== "https://github.com") body.ghes_server = serverUrl;
    try {
        await axios.post(
            `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
            body,
            { timeout: 3000 }
        );
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            core.error(
                "\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m"
            );
            core.error(`\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`);
            process.exit(1);
        }
        core.info("Timeout or API not reachable. Continuing to next step.");
    }
}

(async function () {
    await validateSubscription();
    const args = parseInputs();
    const client = createHttpClient(args);
    await client.get("/rest/api/3/myself");
    writeCredentialsToDisk(args);
})().catch((error) => {
    core.setFailed("An unexpected error occurred, check output");
    core.error(error);
});

function parseInputs() {
    const baseUrl = core.getInput("baseUrl") || process.env.JIRA_BASE_URL;
    const email = core.getInput("email") || process.env.JIRA_USER_EMAIL;
    const token = core.getInput("token") || process.env.JIRA_API_TOKEN;

    if (!baseUrl) {
        throw new Error("Base URL is required");
    }
    if (!email) {
        throw new Error("User email is required");
    }
    if (!token) {
        throw new Error("Access token is required");
    }

    core.setSecret(token);

    return {
        baseUrl,
        email,
        token,
    };
}

function createHttpClient(args) {
    const httpc = axios.create({
        baseURL: args.baseUrl,
        auth: {
            username: args.email,
            password: args.token,
        },
        timeout: 10000,
    });

    const retryCondition = (error) => {
        return (
            axiosRetry.isNetworkOrIdempotentRequestError(error) ||
            ![200].includes(error.response.status)
        );
    };

    axiosRetry(httpc, {
        retries: 1,
        retryCondition: retryCondition,
        retryDelay: () => 10000,
        shouldResetTimeout: true,
        onRetry: (number, error) => {
            core.info(`Request failed with [${error.response?.status}], try again in 10s`);
        },
    });

    return httpc;
}

function writeCredentialsToDisk(args) {
    const jiraDir = path.join(os.homedir(), "jira");
    const configFile = path.join(jiraDir, "config.yml");

    if (!fs.existsSync(jiraDir)) {
        fs.mkdirSync(jiraDir, { mode: 0o700 });
    }

    const data = {
        baseUrl: args.baseUrl,
        email: args.email,
        token: args.token,
    };

    fs.writeFileSync(configFile, yaml.stringify(data), { mode: 0o600 });
    // mode is only applied when the file is created, so tighten a pre-existing one too
    fs.chmodSync(configFile, 0o600);
}

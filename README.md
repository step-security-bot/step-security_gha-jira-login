[![StepSecurity Maintained Action](https://raw.githubusercontent.com/step-security/maintained-actions-assets/main/assets/maintained-action-banner.png)](https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions)

# Github Action - Jira Login

[![Build Status](https://img.shields.io/github/actions/workflow/status/step-security/gha-jira-login/pr.yml?label=Build%20Status)](https://github.com/step-security/gha-jira-login/actions/workflows/pr.yml)


A Github action that takes access credentials and verifies them again Jira REST API.
Upon successful login, the credentials are stored locally in `~/jira/config.yml`.


> Atlassian does not maintain its Github actions anymore. This is an issue since they are
> built with Node v16, which has been marked deprecated by Github and will soon get removed.

Instead of just writing the data to the file, it performs a login attempt to verify the
provided credentials. This allows to fail early if the credentials are incorrect.

## Usage

```yaml
name: Test Action

on:
  [..]

env:
  JIRA_BASE_URL: ${{ secrets.JIRA_URL }} # https://???.atlassian.net
  JIRA_USER_EMAIL: ${{ secrets.JIRA_EMAIL }}
  JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}

jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - name: Jira Login
        uses: step-security/gha-jira-login@v1
        with:
          baseUrl: ${{ secrets.JIRA_URL }}
          email: ${{ secrets.JIRA_EMAIL }}
          token: ${{ secrets.JIRA_TOKEN }}
```

The access information can be provided either as direct action arguments or by setting
env variables. For the env variable names it will use the same names as Atlassian's
login action does to allow for a drop-in replacement. When both are provided, the 
input fields take precedence over the env variables.



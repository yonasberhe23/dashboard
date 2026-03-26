## Agentic Workflows

## Labels

- When an agentic workflow creates a github issues or pull requests it should add a label in the following format: `bot/<bot name>`
  - e.g. bot name is `issue grooming`, label is `bot/issue-grooming`
- An agentic workflow can receive instructions or state via github issue or pull request labels with the following format: `bot/<bot name>/<instruction>`
  - e.g. bot name is `issue grooming`, instruction is `ready for triage`, label is `bot/issue-grooming/ready-for-triage`

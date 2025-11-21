# UI Automation execution on Jenkins

## Infrastructure Configuration

The configuration is handled by the [init.sh](./init.sh) script in this repository.

The script sets up a Linux node at a user-level with the software needed to execute the UI tests using Ansible for infrastructure automation.

It configures a `WORKSPACE` folder in the *PATH* to add the necessary binaries.

In Jenkins executors `WORKSPACE` is a predefined variable to a temporary folder in the *jenkins* user home.

- Golang - For building tools and utilities
- Ansible - For creating and managing infrastructure (k3s, Rancher, test nodes)
- yq - For YAML manipulation and configuration
- semver - For version comparison

If the `JOB_TYPE` is `recurring` that will create a Rancher server instance for the dashboard tests to run on it.

## Ansible Configuration

The initialization script generates an Ansible variables file and calls the Ansible playbook to create infrastructure.

The goal is to have logic in the script for configuring both a Rancher instance and the Dashboard tests node that runs:

 `Dashboard tests node -> Rancher setup`

## Run locally - needs remote aws provider

It is possible to run this locally or in a remote Linux instance.

There are required environment variables set for configuring the script, downloading binary dependencies, and executing Ansible.

This design is mainly due to how the Jenkins Jobs manage the configuration using environment variables.

Some environment variables have default values thus making them optional, others like the following are required:

- `WORKSPACE`
  - This is defined in Jenkins but it isn't a system variable on Linux.
- `QA_INFRA_REPO`
  - Path to the qa-infra-automation repository (defaults to `${WORKSPACE}/qa-infra-automation`)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_ROUTE53_ZONE`
- `AWS_AMI`
- `AWS_SECURITY_GROUP`
- `AWS_SUBNET`
- `AWS_VPC`
- `AWS_VOLUME_TYPE`
- `AWS_VOLUME_IOPS`
- `AWS_SSH_USER`
- `AWS_INSTANCE_TYPE`
- `RANCHER_TYPE`
  - This var defines the logic of how to execute the tests. Options: `recurring`, `existing`, `local`
- `CYPRESS_TAGS`

*For more variables or variable updates take a look at the [init.sh](./init.sh) script.*

Folder structure:

- `WORKSPACE`
  - `qa-infra-automation` - cloned qa-infra-automation repo (contains Ansible playbooks)
  - `dashboard` - cloned repo folder
  - `bin` - folder with binaries and set in the `PATH`
  - `ansible-vars.yaml` - generated Ansible variables file
  - `ansible-output.yaml` - Ansible playbook output (if generated)

From `WORKSPACE`:

`dashboard/cypress/jenkins/init.sh`

## ANSIBLE PLAYBOOK

The Ansible playbook (`ui-dashboard-tests.yml`) creates an AWS ephemeral node to execute the UI tests on a `cypress` docker container.

The Docker image used is the latest `factory` from the `cypress-io/cypress-docker-images` repository [folder](https://github.com/cypress-io/cypress-docker-images/tree/master/factory).
That image can receive arguments for `yarn`, `node`, `cypress` and browsers. This allows the Jenkins job to set these and run.

The Ansible playbook handles infrastructure creation including:
- K3s cluster setup
- Rancher installation (for recurring jobs)
- Test node creation
- Custom nodes for RKE1/RKE2 (if `create_initial_clusters` is enabled)
- Import cluster creation (if needed)

The script has logic for three different environment configurations - `rancher_type`:

- Execute the tests on an `existing` Rancher setup.
- Execute the tests in a Rancher instance running along the tests in the `local` node.
- Do `recurring` execution on an ephemeral Rancher created by the automation for Jenkins.

The Ansible playbook takes the configuration from the generated `ansible-vars.yaml` file created by `init.sh`.

The workflow for the different `rancher_type`(s):

### Existing

- Install all node modules needed for cypress reporting on the `dashboard` cloned repo.
- Utilize an existing `rancher_host` username and password.
- With the username and password, execute a Docker instance with the UI tests
- Generate jUnit and html reports.

### Recurring

- Install all node modules needed for cypress reporting on the `dashboard` cloned repo.
- Grab the information of the ephemeral Rancher automation instance from Ansible output
- With that information like the Rancher username and password, execute a Docker instance with the UI tests
- Generate jUnit and html reports.

### Local

Similar to Drone without the remote reporting and this runs Rancher Docker container and the cypress container.
This is less used in Jenkins and might be a good option for local testing.

- Install all node modules needed for cypress reporting on the `dashboard` cloned repo.
- Build UI assets and setup a Docker Rancher instance with them. (Similar to Drone).
- Attach a second Docker container to the Rancher instance network and execute the UI tests in it.
- Generate jUnit and html reports.

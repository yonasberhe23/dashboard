import ClusterProjectMembersPo from '~/cypress/e2e/po/pages/explorer/cluster-project-members.po';
import HomePagePo from '~/cypress/e2e/po/pages/home.po';

const clusterId = 'local'; // id in 2.9

const userId = 'local://u-59c6r'; // standard user in 2.9

const projectId = 'local:p-w9vkb'; // in 2.8

describe('Test Cluster Role Binding Pagination Fix', { tags: ['@explorer', '@adminUser'] }, () => {
  beforeEach(() => {
    cy.login();
    cy.updateNamespaceFilter(clusterId, 'none', `{\"${ clusterId }\":[]}`);

    HomePagePo.goTo();
  });

  it('cluster membership tab', () => {
    let i = 0;

    while (i < 1) {
      cy.createClusterRoleTemplateBinding(clusterId, userId);
      i++;
    }

    const clusterMembership = new ClusterProjectMembersPo(clusterId, 'cluster-membership');

    clusterMembership.goTo();
    clusterMembership.waitForPage();

    // pagination is visible
    clusterMembership.sortableTable().checkVisible();
  });

  it.only('project membership tab', () => {
    let i = 0;

    while (i < 1) {
      cy.createProjectRoleTemplateBindings(projectId, userId);
      i++;
    }

    const projectMembership = new ClusterProjectMembersPo(clusterId, 'project-membership');

    projectMembership.goTo();
    projectMembership.waitForPage();

    // pagination is visible
    projectMembership.sortableTable().checkVisible();
  });

  it('create user, project, and assign project membership', () => {
    let i = 0;

    while (i < 200) {
      const userName = `e2e-${ Cypress._.uniqueId(Date.now().toString()) }`;

      cy.createProject(userName, clusterId, userId);
      cy.createUser({
        username:    userName,
        globalRole:  { role: 'user' },
        projectRole: {
          clusterId,
          projectName: userName,
          role:        'project-member',
        }
      });

      i++;
    }

    const projectMembership = new ClusterProjectMembersPo(clusterId, 'project-membership');

    projectMembership.goTo();
    projectMembership.waitForPage();

    // pagination is visible
    projectMembership.sortableTable().checkVisible();
  });
});

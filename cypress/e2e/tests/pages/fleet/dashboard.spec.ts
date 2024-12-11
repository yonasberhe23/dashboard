import { FleetDashboardPagePo } from '@/cypress/e2e/po/pages/fleet/fleet-dashboard.po';
import FleetGitRepoDetailsPo from '@/cypress/e2e/po/detail/fleet/fleet.cattle.io.gitrepo.po';
import { GitRepoCreatePo } from '@/cypress/e2e/po/pages/fleet/gitrepo-create.po';
import BurgerMenuPo from '@/cypress/e2e/po/side-bars/burger-side-menu.po';
import { LONG_TIMEOUT_OPT } from '@/cypress/support/utils/timeouts';
import { gitRepoTargetAllClustersRequest } from '@/cypress/e2e/blueprints/fleet/gitrepos';
import { HeaderPo } from '@/cypress/e2e/po/components/header.po';
import { MenuActions } from '@/cypress/support/types/menu-actions';

describe('Fleet Dashboard', { tags: ['@fleet', '@adminUser'] }, () => {
  const fleetDashboardPage = new FleetDashboardPagePo('_');

  const headerPo = new HeaderPo();

  let repoName;
  const gitRepoUrl = 'https://github.com/rancher/fleet-test-data';
  const branch = 'master';
  const paths = 'qa-test-apps/nginx-app';
  const localWorkspace = 'fleet-local';
  let removeGitRepo = false;

  beforeEach(() => {
    cy.login();
    cy.createE2EResourceName('git-repo').then((name) => {
      repoName = name;
    });
  });

  it('has the correct title', () => {
    fleetDashboardPage.goTo();
    fleetDashboardPage.waitForPage();

    fleetDashboardPage.fleetDashboardEmptyState().should('be.visible');

    cy.title().should('eq', 'Rancher - Continuous Delivery - Dashboard');
  });

  it('Get Started button takes you to the correct page', () => {
    const gitRepoCreatePage = new GitRepoCreatePo('_');

    fleetDashboardPage.goTo();
    fleetDashboardPage.waitForPage();

    fleetDashboardPage.fleetDashboardEmptyState().should('be.visible');
    fleetDashboardPage.getStartedButton().click();
    gitRepoCreatePage.waitForPage();
    gitRepoCreatePage.title().contains('Git Repo: Create').should('be.visible');
  });

  it('Should display cluster status', () => {
    // create gitrepo
    cy.createRancherResource('v1', 'fleet.cattle.io.gitrepos', gitRepoTargetAllClustersRequest(localWorkspace, repoName, gitRepoUrl, branch, paths)).then(() => {
      removeGitRepo = true;
    });

    fleetDashboardPage.goTo();
    fleetDashboardPage.waitForPage();

    // check if burguer menu nav is highlighted correctly for Fleet
    BurgerMenuPo.checkIfMenuItemLinkIsHighlighted('Continuous Delivery');

    const row = fleetDashboardPage.sortableTable(localWorkspace).row(0);

    row.get('.bg-success[data-testid="clusters-ready"]', LONG_TIMEOUT_OPT).should('exist');
    row.get('.bg-success[data-testid="clusters-ready"] span').should('have.text', '1/1');

    row.get('.bg-success[data-testid="bundles-ready"]').should('exist');
    row.get('.bg-success[data-testid="bundles-ready"] span').should('have.text', '1/1');

    row.get('.bg-success[data-testid="resources-ready"]').should('exist');
    row.get('.bg-success[data-testid="resources-ready"] span').should('have.text', '1/1');
  });

  it('can navigate to Git Repo details page from Fleet Dashboard', () => {
    const gitRepoDetails = new FleetGitRepoDetailsPo(localWorkspace, repoName);

    fleetDashboardPage.goTo();
    fleetDashboardPage.waitForPage();
    fleetDashboardPage.list().rowWithName(repoName).column(0).find('a')
      .click();
    gitRepoDetails.waitForPage(null, 'bundles');
  });

  it('should only display action menu with allowed actions only', () => {
    fleetDashboardPage.goTo();
    fleetDashboardPage.waitForPage();
    headerPo.selectWorkspace(localWorkspace);

    const constActionMenu = fleetDashboardPage.sortableTable().rowActionMenuOpen(repoName);

    const allowedActions: MenuActions[] = [
      MenuActions.Pause,
      MenuActions.ForceUpdate,
      MenuActions.EditYaml,
      MenuActions.EditConfig,
      MenuActions.Clone,
      MenuActions.DownloadYaml,
      MenuActions.Delete
    ];

    const disabledActions: MenuActions[] = [MenuActions.ChangeWorkspace];

    allowedActions.forEach((action) => {
      constActionMenu.getMenuItem(action).should('exist');
    });

    // Disabled actions should not exist
    disabledActions.forEach((action) => {
      constActionMenu.getMenuItem(action).should('not.exist');
    });
  });

  after(() => {
    if (removeGitRepo) {
      // delete gitrepo
      cy.deleteRancherResource('v1', `fleet.cattle.io.gitrepos/${ localWorkspace }`, repoName);
    }
  });
});

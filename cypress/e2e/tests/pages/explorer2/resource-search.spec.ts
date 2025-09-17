import HomePagePo from '@/cypress/e2e/po/pages/home.po';
import ClusterDashboardPagePo from '@/cypress/e2e/po/pages/explorer/cluster-dashboard.po';
import ResourceSearchDialog from '@/cypress/e2e/po/prompts/ResourceSearchDialog.po';
import { NamespaceFilterPo } from '@/cypress/e2e/po/components/namespace-filter.po';
import { ConfigMapPagePo } from '@/cypress/e2e/po/pages/explorer/config-map.po';

const clusterDashboard = new ClusterDashboardPagePo('local');

describe('Cluster Dashboard', { testIsolation: 'off', tags: ['@explorer2', '@adminUser', '@standardUser'] }, () => {
  before(() => {
    cy.login();
    HomePagePo.goTo();

    ClusterDashboardPagePo.navTo();
  });

  afterEach(() => {
    // Ensure search dialog is closed after each test to prevent cascading failures
    const dialog = new ResourceSearchDialog();

    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="search-modal"]').length > 0) {
        dialog.close();
      }
    });
  });

  it('can show resource search dialog', () => {
    // Open the resource search
    clusterDashboard.clusterActionsHeader().resourceSearchButton().click();

    const dialog = new ResourceSearchDialog();

    dialog.checkExists();
    dialog.checkVisible();

    dialog.searchBox().type('ConfigMap');

    dialog.results().should('have.length', 1);
    dialog.results().first().should('have.text', 'ConfigMaps');

    dialog.close();

    dialog.checkNotExists();
  });

  it('can search by resource group', () => {
    // Open the resource search
    clusterDashboard.clusterActionsHeader().resourceSearchButton().click();

    const dialog = new ResourceSearchDialog();

    dialog.checkExists();
    dialog.checkVisible();

    dialog.searchBox().type('auth');

    // Wait for less than 20 - then we know the results are updated for our search
    dialog.results().should('have.length.lt', 20);
    dialog.results().should('have.length.gt', 1);

    // Check that the first result is one of the expected authentication resources
    // Different K8s versions may have different resources available
    dialog.results().first().should('satisfy', ($el) => {
      const text = $el.text();

      return text === 'SelfSubjectReviews (selfsubjectreviews.authentication.k8s.io)' ||
             text === 'TokenReviews (tokenreviews.authentication.k8s.io)';
    });

    dialog.close();

    dialog.checkNotExists();
  });

  it('can show resource dialog when namespace chooser is open', () => {
    const namespacePicker = new NamespaceFilterPo();

    namespacePicker.toggle();
    namespacePicker.clickOptionByLabel('Only User Namespaces');
    namespacePicker.isChecked('Only User Namespaces');

    // Namespace filter is still open
    const dialog = new ResourceSearchDialog();

    // Open the resource search
    dialog.open();

    dialog.checkExists();
    dialog.checkVisible();

    dialog.searchBox().type('ConfigMap');

    dialog.results().should('have.length', 1);
    dialog.results().first().should('have.text', 'ConfigMaps');

    dialog.results().first().click();

    const configMapPage = new ConfigMapPagePo('local');

    configMapPage.waitForPage();

    dialog.checkNotExists();
  });
});

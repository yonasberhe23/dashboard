
import HomePagePo from '@/cypress/e2e/po/pages/home.po';
import { FeatureFlagsPagePo } from '@/cypress/e2e/po/pages/global-settings/feature-flags.po';

// Vai ('ui-sql-cache') is now on by default. This sets up the `noVai` test suite by disabling it

const featureFlagsPage = new FeatureFlagsPagePo('local');

describe('Disable Vai', { testIsolation: 'off', tags: ['@noVai', '@adminUser'] }, () => {
  before(() => {
    cy.login();
    HomePagePo.goTo();
  });

  it('Disable Feature Flag', () => {
    FeatureFlagsPagePo.navTo();
    featureFlagsPage.waitForPage();

    const key = 'ui-sql-cache';

    featureFlagsPage.self().should('not.contain', key);
    cy.isVaiCacheEnabled().should('eq', true);

    cy.getRancherResource('v1', 'management.cattle.io.features', key).then((resp) => {
      const resource = resp.body;

      delete resource.links;
      delete resource.metadata.creationTimestamp;
      delete resource.metadata.generation;
      delete resource.metadata.state;

      resource.spec.value = false;

      // Causes Rancher to restart
      cy.setRancherResource('v1', 'management.cattle.io.features', key, JSON.stringify(resource));

      // Wait for Rancher to start restarting....
      cy.waitForRancherResource('v1', 'management.cattle.io.features', key, (resp: any) => resp.status > 399, 20, { failOnStatusCode: false });

      // Wait for Rancher to be ready again... and also check it's set
      cy.waitForRancherResource('v1', 'management.cattle.io.features', key, (resp) => {
        return resp?.body?.spec?.value === false;
      }, 20, { failOnStatusCode: false });
    });
  });
});

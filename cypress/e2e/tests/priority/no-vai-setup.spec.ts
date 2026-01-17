
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
  });
});

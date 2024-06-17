import { ServiceAccountsPagePo } from '@/cypress/e2e/po/pages/explorer/service-accounts.po';
import { groupByPayload } from '@/cypress/e2e/blueprints/user_preferences/group_by';
import HomePagePo from '@/cypress/e2e/po/pages/home.po';
import { generateServiceAccDataSmall, serviceAccNoData } from '@/cypress/e2e/blueprints/explorer/core/service-accounts-get';

const serviceAccountsPagePo = new ServiceAccountsPagePo();

describe('Service Accounts', { testIsolation: 'off', tags: ['@explorer', '@adminUser'] }, () => {
  before(() => {
    cy.login();
  });

  describe('List', { tags: ['@vai'] }, () => {
    before('set up', () => {
      // set user preferences: update resource filter
      cy.getRancherResource('v3', 'users?me=true').then((resp: Cypress.Response<any>) => {
        const userId = resp.body.data[0].id.trim();

        cy.setRancherResource('v1', 'userpreferences', userId, groupByPayload(userId, 'local', 'none', '{\"local\":[]}'));
      });
      HomePagePo.goTo(); // this is needed for updated user preferences to load in the UI
    });

    it('validate services table in empty state', () => {
      serviceAccNoData();

      serviceAccountsPagePo.goTo();
      serviceAccountsPagePo.waitForPage();
      cy.wait('@serviceAccNoData');

      const expectedHeaders = ['State', 'Name', 'Namespace', 'Secrets', 'Age'];

      serviceAccountsPagePo.list().resourceTable().sortableTable().tableHeaderRow()
        .find('.table-header-container .content')
        .each((el, i) => {
          expect(el.text().trim()).to.eq(expectedHeaders[i]);
        });

      serviceAccountsPagePo.list().resourceTable().sortableTable().checkRowCount(true, 1);
    });

    it('flat list: validate services table', () => {
      generateServiceAccDataSmall();
      serviceAccountsPagePo.goTo();
      serviceAccountsPagePo.waitForPage();
      cy.wait('@serviceAccDataSmall');

      // check table headers are visible
      const expectedHeaders = ['State', 'Name', 'Namespace', 'Secrets', 'Age'];

      serviceAccountsPagePo.list().resourceTable().sortableTable().tableHeaderRow()
        .find('.table-header-container .content')
        .each((el, i) => {
          expect(el.text().trim()).to.eq(expectedHeaders[i]);
        });

      serviceAccountsPagePo.list().resourceTable().sortableTable().checkVisible();
      serviceAccountsPagePo.list().resourceTable().sortableTable().checkLoadingIndicatorNotVisible();
      serviceAccountsPagePo.list().resourceTable().sortableTable().noRowsShouldNotExist();
      serviceAccountsPagePo.list().resourceTable().sortableTable().checkRowCount(false, 3);
    });

    it('group by namespace: validate services table', () => {
      generateServiceAccDataSmall();
      serviceAccountsPagePo.goTo();
      serviceAccountsPagePo.waitForPage();
      cy.wait('@serviceAccDataSmall');

      // group by namespace
      serviceAccountsPagePo.list().resourceTable().sortableTable().groupByButtons(1)
        .click();

      //  check table headers are visible
      const expectedHeaders = ['State', 'Name', 'Secrets', 'Age'];

      serviceAccountsPagePo.list().resourceTable().sortableTable().tableHeaderRow()
        .find('.table-header-container .content')
        .each((el, i) => {
          expect(el.text().trim()).to.eq(expectedHeaders[i]);
        });

      serviceAccountsPagePo.list().resourceTable().sortableTable().checkVisible();
      serviceAccountsPagePo.list().resourceTable().sortableTable().checkLoadingIndicatorNotVisible();
      serviceAccountsPagePo.list().resourceTable().sortableTable().noRowsShouldNotExist();
      serviceAccountsPagePo.list().resourceTable().sortableTable().groupElementWithName('Namespace: cattle-system')
        .scrollIntoView()
        .should('be.visible');
      serviceAccountsPagePo.list().resourceTable().sortableTable().checkRowCount(false, 3);
    });

    after('clean up', () => {
      cy.getRancherResource('v3', 'users?me=true').then((resp: Cypress.Response<any>) => {
        const userId = resp.body.data[0].id.trim();

        cy.setRancherResource('v1', 'userpreferences', userId, groupByPayload(userId, 'local', 'none', '{"local":["all://user"]}'));
      });
    });
  });
});

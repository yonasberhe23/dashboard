import { ServicesPagePo } from '~/cypress/e2e/po/pages/explorer/services.po';
import { groupByPayload } from '@/cypress/e2e/blueprints/user_preferences/group_by';
import HomePagePo from '@/cypress/e2e/po/pages/home.po';
import { generateServicesDataSmall, servicesNoData } from '@/cypress/e2e/blueprints/explorer/workloads/service-discovery/services-get';

const servicesPagePo = new ServicesPagePo();

describe('Services', { testIsolation: 'off', tags: ['@explorer', '@adminUser'] }, () => {
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
      servicesNoData();
      servicesPagePo.goTo();
      servicesPagePo.waitForPage();
      cy.wait('@servicesNoData');

      const expectedHeaders = ['State', 'Name', 'Namespace', 'Target', 'Selector', 'Type', 'Age'];

      servicesPagePo.list().resourceTable().sortableTable().tableHeaderRow()
        .find('.table-header-container .content')
        .each((el, i) => {
          expect(el.text().trim()).to.eq(expectedHeaders[i]);
        });

      servicesPagePo.list().resourceTable().sortableTable().checkRowCount(true, 1);
    });

    it('flat list: validate services table', () => {
      generateServicesDataSmall();
      servicesPagePo.goTo();
      servicesPagePo.waitForPage();
      cy.wait('@servicesDataSmall');

      // check table headers are visible
      const expectedHeaders = ['State', 'Name', 'Namespace', 'Target', 'Selector', 'Type', 'Age'];

      servicesPagePo.list().resourceTable().sortableTable().tableHeaderRow()
        .find('.table-header-container .content')
        .each((el, i) => {
          expect(el.text().trim()).to.eq(expectedHeaders[i]);
        });

      servicesPagePo.list().resourceTable().sortableTable().checkVisible();
      servicesPagePo.list().resourceTable().sortableTable().checkLoadingIndicatorNotVisible();
      servicesPagePo.list().resourceTable().sortableTable().noRowsShouldNotExist();
      servicesPagePo.list().resourceTable().sortableTable().checkRowCount(false, 3);
    });

    it('group by namespace: validate services table', () => {
      generateServicesDataSmall();
      servicesPagePo.goTo();
      servicesPagePo.waitForPage();
      cy.wait('@servicesDataSmall');

      // group by namespace
      servicesPagePo.list().resourceTable().sortableTable().groupByButtons(1)
        .click();

      //  check table headers are visible
      const expectedHeaders = ['State', 'Name', 'Target', 'Selector', 'Type', 'Age'];

      servicesPagePo.list().resourceTable().sortableTable().tableHeaderRow()
        .find('.table-header-container .content')
        .each((el, i) => {
          expect(el.text().trim()).to.eq(expectedHeaders[i]);
        });

      servicesPagePo.list().resourceTable().sortableTable().checkVisible();
      servicesPagePo.list().resourceTable().sortableTable().checkLoadingIndicatorNotVisible();
      servicesPagePo.list().resourceTable().sortableTable().noRowsShouldNotExist();
      servicesPagePo.list().resourceTable().sortableTable().groupElementWithName('Namespace: cattle-system')
        .scrollIntoView()
        .should('be.visible');
      servicesPagePo.list().resourceTable().sortableTable().checkRowCount(false, 3);
    });

    after('clean up', () => {
      cy.getRancherResource('v3', 'users?me=true').then((resp: Cypress.Response<any>) => {
        const userId = resp.body.data[0].id.trim();

        cy.setRancherResource('v1', 'userpreferences', userId, groupByPayload(userId, 'local', 'none', '{"local":["all://user"]}'));
      });
    });
  });
});

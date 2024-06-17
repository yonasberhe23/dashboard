import { IngressPagePo } from '@/cypress/e2e/po/pages/explorer/ingress.po';
import { groupByPayload } from '@/cypress/e2e/blueprints/user_preferences/group_by';
import HomePagePo from '@/cypress/e2e/po/pages/home.po';

const ingressPagePo = new IngressPagePo();

describe('Ingresses', { testIsolation: 'off', tags: ['@explorer', '@adminUser'] }, () => {
  before(() => {
    cy.login();
  });

  it('does not show console warning due to lack of secondary schemas needed to load data on list view', () => {
    // pattern as per https://docs.cypress.io/faq/questions/using-cypress-faq#How-do-I-spy-on-consolelog
    cy.visit(ingressPagePo.urlPath(), {
      onBeforeLoad(win) {
        cy.stub(win.console, 'warn').as('consoleWarn');
      },
    });

    cy.title().should('eq', 'Rancher - local - Ingresses');

    const warnMsg = "pathExistsInSchema requires schema networking.k8s.io.ingress to have resources fields via schema definition but none were found. has the schema 'fetchResourceFields' been called?";

    // testing https://github.com/rancher/dashboard/issues/11086
    cy.get('@consoleWarn').should('not.be.calledWith', warnMsg);
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

    it('flat list: validate ingresses table', () => {
      ingressPagePo.goTo();
      ingressPagePo.waitForPage();

      // check table headers are visible
      const expectedHeaders = ['State', 'Name', 'Namespace', 'Target', 'Default', 'Ingress Class', 'Age'];

      ingressPagePo.list().resourceTable().sortableTable().tableHeaderRow()
        .find('.table-header-container .content')
        .each((el, i) => {
          expect(el.text().trim()).to.eq(expectedHeaders[i]);
        });

      ingressPagePo.list().resourceTable().sortableTable().checkVisible();
      ingressPagePo.list().resourceTable().sortableTable().checkLoadingIndicatorNotVisible();
      ingressPagePo.list().resourceTable().sortableTable().noRowsShouldNotExist();
      ingressPagePo.list().resourceTable().sortableTable().checkRowCount(false, 1);
    });

    it('group by namespace: validate ingresses table', () => {
      ingressPagePo.goTo();
      ingressPagePo.waitForPage();

      // group by namespace
      ingressPagePo.list().resourceTable().sortableTable().groupByButtons(1)
        .click();

      //  check table headers are visible
      const expectedHeaders = ['State', 'Name', 'Target', 'Default', 'Ingress Class', 'Age'];

      ingressPagePo.list().resourceTable().sortableTable().tableHeaderRow()
        .find('.table-header-container .content')
        .each((el, i) => {
          expect(el.text().trim()).to.eq(expectedHeaders[i]);
        });

      ingressPagePo.list().resourceTable().sortableTable().checkVisible();
      ingressPagePo.list().resourceTable().sortableTable().checkLoadingIndicatorNotVisible();
      ingressPagePo.list().resourceTable().sortableTable().noRowsShouldNotExist();
      ingressPagePo.list().resourceTable().sortableTable().groupElementWithName('Namespace: cattle-system')
        .should('be.visible');
      ingressPagePo.list().resourceTable().sortableTable().checkRowCount(false, 1);
    });

    after('clean up', () => {
      cy.getRancherResource('v3', 'users?me=true').then((resp: Cypress.Response<any>) => {
        const userId = resp.body.data[0].id.trim();

        cy.setRancherResource('v1', 'userpreferences', userId, groupByPayload(userId, 'local', 'none', '{"local":["all://user"]}'));
      });
    });
  });
});

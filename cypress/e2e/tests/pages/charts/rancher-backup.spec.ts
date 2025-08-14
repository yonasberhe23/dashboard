import { ChartPage } from '@/cypress/e2e/po/pages/explorer/charts/chart.po';
import RadioGroupInputPo from '@/cypress/e2e/po/components/radio-group-input.po';
import { exampleStorageClass, defaultStorageClass } from '@/cypress/e2e/blueprints/charts/rancher-backup-chart';
import LabeledSelectPo from '@/cypress/e2e/po/components/labeled-select.po';
import TabbedPo from '@/cypress/e2e/po/components/tabbed.po';
import HomePagePo from '@/cypress/e2e/po/pages/home.po';
import { InstallChartPage } from '@/cypress/e2e/po/pages/explorer/charts/install-charts.po';

const STORAGE_CLASS_RESOURCE = 'storage.k8s.io.storageclasses';

describe('Charts', { tags: ['@charts', '@adminUser'] }, () => {
  describe('Rancher Backups', () => {
    const chartPage = new ChartPage();

    before(() => {
      cy.login();
      HomePagePo.goTo();
    });

    describe('Rancher Backups storage class config', () => {
      beforeEach(() => {
        cy.intercept('/v1/storage.k8s.io.storageclasses?*').as('storageClasses');
        cy.intercept('/v1/persistentvolumes?*').as('persistentVolumes');

        cy.createRancherResource('v1', STORAGE_CLASS_RESOURCE, JSON.stringify(defaultStorageClass));
        cy.createRancherResource('v1', STORAGE_CLASS_RESOURCE, JSON.stringify(exampleStorageClass));
      });

      afterEach(() => {
        cy.deleteRancherResource('v1', STORAGE_CLASS_RESOURCE, 'test-default-storage-class');
        cy.deleteRancherResource('v1', STORAGE_CLASS_RESOURCE, 'test-no-annotations');
      });

      it('Should auto-select default storage class', () => {
        ChartPage.navTo(null, 'Rancher Backups');
        chartPage.waitForPage('repo-type=cluster&repo=rancher-charts&chart=rancher-backup');

        const installPage = new InstallChartPage();

        chartPage.goToInstall();
        installPage.nextPage();
        cy.wait('@storageClasses', { timeout: 10000 }).its('response.statusCode').should('eq', 200);
        cy.wait('@persistentVolumes', { timeout: 10000 }).its('response.statusCode').should('eq', 200);

        installPage.waitForPage('repo-type=cluster&repo=rancher-charts&chart=rancher-backup');

        // Wait for the newly created default storage class to be properly registered
        // by ensuring it's available in the storage classes list
        cy.getRancherResource('v1', 'storage.k8s.io.storageclasses', 'test-default-storage-class')
          .should('exist');

        // Wait for Kubernetes to process the storage class changes
        // This gives time for the cluster to recognize the new default storage class
        cy.wait(3000); // eslint-disable-line cypress/no-unnecessary-waiting

        // Scroll into view - scroll to bottom of view
        cy.get('.main-layout > .outlet > .outer-container').scrollTo('bottom');

        // Select the 'Use an existing storage class' option
        const storageOptions = new RadioGroupInputPo('[chart="[chart: cluster/rancher-charts/rancher-backup]"]');

        // Check that the control exists
        storageOptions.checkExists();

        storageOptions.set(2);

        // Scroll into view - scroll to bottom of view
        cy.get('.main-layout > .outlet > .outer-container').scrollTo('bottom');

        // Verify that the drop-down exists and has the default storage class selected
        const select = new LabeledSelectPo('[data-testid="backup-chart-select-existing-storage-class"]');

        select.checkExists();

        // Wait for the storage class dropdown to be populated with the new default storage class
        // This ensures the UI has updated to reflect the newly created default storage class
        cy.get('[data-testid="backup-chart-select-existing-storage-class"]')
          .should('contain', 'test-default-storage-class')
          .and('not.contain', 'local-path');

        // Wait for the dropdown to actually show the new storage class as selected
        // This handles the case where the storage class exists but isn't yet recognized as default
        cy.get('[data-testid="backup-chart-select-existing-storage-class"]').then(($el) => {
          // Check if the new storage class is actually selected/visible as the default
          const text = $el.text();

          expect(text).to.contain('test-default-storage-class');
          // The old default should no longer be the selected option
          expect(text).to.not.contain('local-path');
        });

        select.checkOptionSelected('test-default-storage-class');

        // Verify that changing tabs doesn't reset the last selected storage class option
        installPage.editYaml();
        const tabbedOptions = new TabbedPo();

        installPage.editOptions(tabbedOptions, '[data-testid="button-group-child-0"]');

        select.checkExists();
        select.checkOptionSelected('test-default-storage-class');
      });
    });
  });
});

import { FleetClusterGroupsListPagePo } from '@/cypress/e2e/po/pages/fleet/fleet.cattle.io.clustergroup';
import FleetClusterGroupDetailsPo from '@/cypress/e2e/po/detail/fleet/fleet.cattle.io.clustergroup.po';

describe('Cluster Groups', { testIsolation: 'off', tags: ['@fleet', '@adminUser'] }, () => {
  const fleetClusterGroups = new FleetClusterGroupsListPagePo();

  describe('List', { tags: ['@vai'] }, () => {
    before(() => {
      cy.login();
    });

    it('check table headers are available in list and details view', () => {
      const groupName = 'default';
      const workspace = 'fleet-local';

      fleetClusterGroups.navTo();
      fleetClusterGroups.waitForPage();
      fleetClusterGroups.selectWorkspace(workspace);
      fleetClusterGroups.clusterGroupsList().rowWithName(groupName).checkVisible();

      // check table headers
      const expectedHeaders = ['State', 'Name', 'Clusters Ready', 'Resources', 'Age'];

      fleetClusterGroups.clusterGroupsList().resourceTable().sortableTable().tableHeaderRow()
        .find('.table-header-container .content')
        .each((el, i) => {
          expect(el.text().trim()).to.eq(expectedHeaders[i]);
        });

      // go to fleet cluster details
      fleetClusterGroups.goToDetailsPage(groupName);

      const fleetClusterGroupDetailsPage = new FleetClusterGroupDetailsPo(workspace, groupName);

      fleetClusterGroupDetailsPage.waitForPage(null, 'clusters');

      // check table headers
      const expectedHeadersDetailsView = ['State', 'Name', 'Bundles Ready', 'Repos Ready', 'Resources', 'Last Seen', 'Age'];

      fleetClusterGroupDetailsPage.clusterList().resourceTable().sortableTable()
        .tableHeaderRow()
        .find('.table-header-container .content')
        .each((el, i) => {
          expect(el.text().trim()).to.eq(expectedHeadersDetailsView[i]);
        });
    });
  });
});

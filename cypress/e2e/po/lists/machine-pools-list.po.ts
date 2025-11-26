import BaseResourceList from '@/cypress/e2e/po/lists/base-resource-list.po';
import ResourceTablePo from '@/cypress/e2e/po/components/resource-table.po';
import TooltipPo from '@/cypress/e2e/po/components/tooltip.po';
import { GetOptions } from '@/cypress/e2e/po/components/component.po';
import { promptModal } from '@/cypress/e2e/po/prompts/shared/modalInstances.po';

export default class MachinePoolsListPo extends BaseResourceList {
  details(name: string, index: number) {
    return this.resourceTable().sortableTable().rowWithPartialName(name).column(index);
  }

  downloadYamlButton() {
    return new ResourceTablePo(this.self()).downloadYamlButton();
  }

  machinePoolCount(poolName: string, count: any, options?: GetOptions) {
    return this.resourceTable().sortableTable().groupElementWithName(poolName)
      .find('.group-header-buttons')
      .contains(count, options);
  }

  scaleDownButton(poolName: string, button: 'plus' | 'minus') {
    return this.resourceTable().sortableTable().groupElementWithName(poolName)
      .find('.group-header-buttons button')
      .first();
  }

  scaleUpButton(poolName: string, button: 'plus' | 'minus') {
    return this.resourceTable().sortableTable().groupElementWithName(poolName)
      .find('.group-header-buttons button')
      .last();
  }

  scaleButtonTooltip(poolName: string, button: 'plus' | 'minus'): TooltipPo {
    return new TooltipPo(this.resourceTable().sortableTable().groupElementWithName(poolName)
      .find(`.group-header-buttons button .icon-${ button }`));
  }

  /**
   * Handle the scale down confirmation modal if it appears.
   * The confirmation modal appears conditionally based on user preferences (SCALE_POOL_PROMPT).
   * If the user has disabled "Do not ask for confirmation when scaling down node pools" in preferences,
   * the modal will not appear and the scale down happens immediately. The conditional check ensures
   * test retryability by only interacting with the modal when it's actually displayed in the UI.
   * @param poolName - The name of the machine pool to verify in the modal
   */
  confirmScaleDownIfModalAppears(poolName: string) {
    promptModal().ifAppears((modal) => {
      modal.getBody().should('contain', 'You are attempting to delete the MachineDeployment');
      modal.getBody().should('contain', poolName);
      modal.clickActionButton('Confirm');
    });
  }
}

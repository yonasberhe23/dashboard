import ComponentPo from '@/cypress/e2e/po/components/component.po';
import TooltipPo from '@/cypress/e2e/po/components/tooltip.po';

export default class KeyboardMappingIndicatorPo extends ComponentPo {
  constructor() {
    super('[data-testid="code-mirror-keymap"]');
  }

  /**
   * Get tooltip functionality for this component
   */
  tooltip(): TooltipPo {
    return new TooltipPo(this.self());
  }
}

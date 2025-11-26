import ComponentPo from '@/cypress/e2e/po/components/component.po';
import CardPo from '@/cypress/e2e/po/components/card.po';
import LabeledSelectPo from '@/cypress/e2e/po/components/labeled-select.po';
import CheckboxInputPo from '@/cypress/e2e/po/components/checkbox-input.po';

export default class GenericPrompt extends ComponentPo {
  card = new CardPo();

  getTitle() {
    return this.card.getTitle();
  }

  getBody() {
    return this.card.getBody();
  }

  labeledSelect(selector = '.labeled-select'): LabeledSelectPo {
    return new LabeledSelectPo(selector);
  }

  checkbox(selector = '[data-checkbox-ctrl]') {
    return new CheckboxInputPo(this.self().get(selector));
  }

  clickActionButton(text: string) {
    return this.card.getActionButton().contains(text).click();
  }

  /**
   * Conditionally handle the modal if it appears in the UI.
   * Some modals appear conditionally based on user preferences or other factors.
   * This method checks if the modal card exists and executes the provided callback if it does.
   * This ensures test retryability by only interacting with the modal when it's actually displayed.
   * @param callback - Function to execute if the modal appears. Receives this GenericPrompt instance as argument.
   */
  ifAppears(callback: (prompt: GenericPrompt) => void) {
    const prompt = this;

    cy.get('body')
      .then(($body) => {
        const modalExists = $body.find('[data-testid="card"]').length > 0;

        if (modalExists) {
          callback(prompt);
        }
      });
  }
}

import PagePo from '@/cypress/e2e/po/pages/page.po';
import RadioGroupInputPo from '@/cypress/e2e/po/components/radio-group-input.po';
import LabeledInputPo from '@/cypress/e2e/po/components/labeled-input.po';
import AsyncButtonPo from '@/cypress/e2e/po/components/async-button.po';
import ProductNavPo from '@/cypress/e2e/po/side-bars/product-side-nav.po';
import BurgerMenuPo from '@/cypress/e2e/po/side-bars/burger-side-menu.po';
import BannersPo from '@/cypress/e2e/po/components/banners.po';

export default class GitHubPo extends PagePo {
  private static createPath(clusterId: string) {
    return `/c/${ clusterId }/auth/config/github?mode=edit`;
  }

  static goTo(clusterId: string): Cypress.Chainable<Cypress.AUTWindow> {
    return super.goTo(GitHubPo.createPath(clusterId));
  }

  constructor(clusterId: string) {
    super(GitHubPo.createPath(clusterId));
  }

  static navTo() {
    const sideNav = new ProductNavPo();

    BurgerMenuPo.burgerMenuNavToMenubyLabel('Users & Authentication');
    sideNav.navToSideMenuEntryByLabel('Auth Provider');
  }

  githubAppLink() {
    return this.self().get('ul.step-list [href="https://github.com/settings/developers"]').then((el) => {
      expect(el).to.have.attr('target');
    })
      .invoke('removeAttr', 'target');
  }

  authConfigRadioBtn(): RadioGroupInputPo {
    return new RadioGroupInputPo('[data-testid="endpoints-radio-input"]');
  }

  selectLoginCofigOption(index: number): Cypress.Chainable {
    return this.authConfigRadioBtn().set(index);
  }

  bannerContent(element:string) {
    return new BannersPo('[data-testid="banner-content"]', this.self()).bannerElement(element);
  }

  clientId() {
    return new LabeledInputPo('[data-testid="input-github-clientId"]');
  }

  clientSecret() {
    return new LabeledInputPo('[data-testid="input-github-clientSecret"]');
  }

  disable() {
    this.bannerContent('button').contains('Disable').click();
  }

  saveButton(): AsyncButtonPo {
    return new AsyncButtonPo('[data-testid="form-save"]', this.self());
  }

  save() {
    return new AsyncButtonPo('[data-testid="form-save"]').click();
  }
}

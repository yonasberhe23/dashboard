import GitHubPo from '@/cypress/e2e/po/edit/auth/github.po';
import AuthProviderPo from '@/cypress/e2e/po/pages/users-and-auth/authProvider.po';
import { LoginPagePo } from '@/cypress/e2e/po/pages/login-page.po';
import HomePagePo from '@/cypress/e2e/po/pages/home.po';
import UserMenuPo from '@/cypress/e2e/po/side-bars/user-menu.po';
import { LONG_TIMEOUT_OPT, MEDIUM_TIMEOUT_OPT } from '@/cypress/support/utils/timeouts';

const authProviderPo = new AuthProviderPo('local');
const githubPo = new GitHubPo('local');
const loginPage = new LoginPagePo();
const homePage = new HomePagePo();
const userMenu = new UserMenuPo();

let clientSecret: string;
let clientId: string;
let appName = '';

function signin() {
  cy.url().should('include', 'https://github.com/login');
  cy.get('#login_field').type('yonasberhe24');
  cy.get('#password').type('Wwuxc11!!');
  cy.get('input[type="submit"]').contains('Sign in').click();
}

describe('GitHub', { tags: ['@adminUser', '@usersAndAuths'] }, () => {
  before(() => {
    cy.createE2EResourceName('github').then((name) => {
      appName = name;
    });
  });

  beforeEach(() => {
    cy.login();
  });

  it('Configure OAuth App in GitHub', () => {
    authProviderPo.goTo();
    authProviderPo.waitForPage();
    authProviderPo.selectGit();
    githubPo.waitForPage();

    githubPo.githubAppLink().click();

    signin();
    cy.url().should('include', 'github.com/settings/developers');
    cy.visit('https://github.com/settings/applications/new');
    cy.url().should('include', 'https://github.com/settings/applications/new');
    cy.get('#oauth_application_name').type(appName);
    cy.get('#oauth_application_url').type(`${ Cypress.env('api') }`);
    cy.get('#oauth_application_callback_url').type(`${ Cypress.env('api') }`);

    cy.intercept('POST', 'https://github.com/settings/applications').as('createGitApp');
    cy.get('button.btn').contains('Register application').click();
    cy.wait('@createGitApp');

    cy.url().should('include', 'github.com/settings/applications');

    cy.contains('div', 'Client ID').next('code').invoke('text').then((text) => {
      clientId = text;
    });

    cy.get('input.btn').contains('Generate a new client secret').click();
    cy.get('#new-oauth-token').invoke('text').then((text) => {
      clientSecret = text;
    });
  });

  it('Enabled GitHub authentication provider in Rancher', () => {
    cy.intercept('POST', 'v3/githubConfigs/github?action=configureTest').as('configureTest');
    cy.intercept('PUT', 'v3/githubConfigs/github').as('saveConfig');

    authProviderPo.goTo();
    authProviderPo.waitForPage();
    authProviderPo.selectGit();
    githubPo.waitForPage();

    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Inactive');
    githubPo.bannerContent('span').should('contain.text', 'The GitHub authentication provider is currently disabled.');

    githubPo.saveButton().checkVisible();
    // githubPo.clientId().set(clientId);
    // githubPo.clientSecret().set(clientSecret);
    cy.get('input[type="text"]').type(clientId);
    cy.get('input[type="password"]').type(clientSecret);

    githubPo.saveButton().expectToBeEnabled();

    cy.window().then((win) => {
      cy.spy(win, 'open').as('open');
    });

    githubPo.save();

    cy.wait('@configureTest');

    // github auth popup - sign in
    cy.get('@open')
      .its('firstCall.returnValue')
      .wait(2000) // TODO
      .then((childWindow) => {
        expect(childWindow.document.title).to.include('Sign in to GitHub');
        cy.wrap(childWindow.document.body).find('#login_field').type('yonasberhe24');
        cy.wrap(childWindow.document.body).find('#password').type('Wwuxc11!!');
        cy.wrap(childWindow.document.body).find('input[type="submit"]').contains('Sign in').click();
      });

    // github auth popup - authorize app
    cy.get('@open')
      .its('firstCall.returnValue')
      .wait(2000) // TODO
      .then((childWindow) => {
        expect(childWindow.document.title).to.include('Authorize application');
        cy.wrap(childWindow.document.body)
          .find('button[name="authorize"]', LONG_TIMEOUT_OPT)
          .contains('Authorize ')
          .should('be.enabled')
          .click();
      });

    cy.wait('@saveConfig', MEDIUM_TIMEOUT_OPT).its('response.statusCode').should('eq', 200);

    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Active');
    githubPo.bannerContent('div.text').should('contain.text', 'The GitHub authentication provider is currently enabled.');

    // TODO
    // verify server/client id values display
  });

  it('GitHub Auth Login/Logout flow', () => {
    authProviderPo.goTo();
    githubPo.waitForPage();

    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Active');
    githubPo.bannerContent('div.text').should('contain.text', 'The GitHub authentication provider is currently enabled.');

    userMenu.clickMenuItem('Log Out');
    loginPage.waitForPage();

    // check 'Log in with Github' and 'Use a local user' options available
    loginPage.useAuthProvider('Log in with GitHub').isVisible();
    loginPage.useLocal().isVisible();

    // 'Log in with Github' - user lands on github auth page
    loginPage.useAuthProvider('Log in with GitHub').click();
    signin();
    homePage.waitForPage();

    // check github avatar and username in user menu
    userMenu.userImage().find('.user-image img').then((el) => {
      expect(el).to.have.attr('src').to.include('https://avatars.githubusercontent.com');
      expect(el).to.have.class('avatar-round');
    });
    userMenu.open();
    userMenu.userMenu().find('li.user-info .user-name').should('contain.text', 'yonasberhe24');

    // logout - check success message on screen
    userMenu.clickMenuItem('Log Out');
    loginPage.waitForPage();
    loginPage.loginPageMessage().should('contain.text', 'You\'ve been logged out of Rancher, however you may still be logged in to your single sign-on identity provider.');
  });

  it('Restrictions', () => {
    cy.login(undefined, undefined, true);

    authProviderPo.goTo();
    githubPo.waitForPage();

    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Active');
    githubPo.bannerContent('div.text').should('contain.text', 'The GitHub authentication provider is currently enabled.');

    // set restriction

    // add github user

    userMenu.clickMenuItem('Log Out');
    loginPage.waitForPage();

    // 'Log in with Github' - check github avatar and username in user menu
    loginPage.useAuthProvider('Log in with GitHub').click();
    homePage.waitForPage();
    userMenu.userImage().find('.user-image img').then((el) => {
      expect(el).to.have.attr('src').to.include('https://avatars.githubusercontent.com');
      expect(el).to.have.class('avatar-round');
    });
    userMenu.open();
    userMenu.userMenu().find('li.user-info .user-name').should('contain.text', 'yonasberhe24');
  });

  it('Disable GitHub authentication provider in Rancher', () => {
    cy.intercept('POST', 'v3/githubConfigs/github?action=disable').as('disableAuth');
    cy.intercept('POST', 'v3/tokens?action=logout').as('authError');

    authProviderPo.goTo();
    githubPo.waitForPage();

    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Active');
    githubPo.bannerContent('div.text').should('contain.text', 'The GitHub authentication provider is currently enabled.');

    githubPo.disable();
    authProviderPo.disableAuthProviderModal().submit('Disable');
    cy.wait('@disableAuth').its('response.statusCode').should('eq', 200);
    cy.wait('@authError').its('response.statusCode').should('eq', 401);

    githubPo.bannerContent('span').should('contain.text', 'Unauthorized 401: must authenticate');

    // user should land on login page
    loginPage.waitForPage();

    // 'Log in with Github' option NOT available
    loginPage.useAuthProvider('Log in with GitHub').should('not.exist');
  });
});

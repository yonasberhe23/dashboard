import GitHubPo from '@/cypress/e2e/po/edit/auth/github.po';
import AuthProviderPo from '@/cypress/e2e/po/pages/users-and-auth/authProvider.po';
import { LoginPagePo } from '@/cypress/e2e/po/pages/login-page.po';
import HomePagePo from '@/cypress/e2e/po/pages/home.po';
import UserMenuPo from '@/cypress/e2e/po/side-bars/user-menu.po';
import GitHubThirdPartyPo from '@/cypress/e2e/po/third-party-apps/github.po';

const authProviderPo = new AuthProviderPo('local');
const githubPo = new GitHubPo('local');
const loginPage = new LoginPagePo();
const homePage = new HomePagePo();
const userMenu = new UserMenuPo();
const gitHubThirdPartyPo = new GitHubThirdPartyPo();

let disableAuth = false;

const userInfo = {
  user1: { username: Cypress.env('githubUser1'), password: Cypress.env('githubPassword1') },
  user2: { username: Cypress.env('githubUser2'), password: Cypress.env('githubPassword2') }
};

function githubSignin(username: string, password: string) {
  cy.origin('https://github.com', { args: { username, password } }, ({ username, password }) => {
    cy.url().should('include', 'https://github.com/login');
    cy.get('#login_field').type(username);
    cy.get('#password').type(password);
    cy.get('input').contains('Sign in').click();
  // gitHubThirdPartyPo.usernameField(username);
  // gitHubThirdPartyPo.passwordField(password);
  // gitHubThirdPartyPo.signInButton().click();
  });
}

describe('GitHub Auth', { tags: ['@adminUser', '@usersAndAuths', '@jenkins', '@debug'] }, () => {
  it('Form Validation: Enable GitHub authentication provider with valid credentials', () => {
    cy.login();
    authProviderPo.goTo();
    authProviderPo.waitForPage();
    authProviderPo.selectGit();
    githubPo.waitForPage();

    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Inactive');
    githubPo.bannerContent('span').should('contain.text', 'The GitHub authentication provider is currently disabled.');

    githubPo.saveButton().checkVisible();
    githubPo.saveButton().isDisabled();
    // githubPo.clientId().set(clientId);
    // githubPo.clientSecret().set(clientSecret);
    cy.get('input[type="text"]').type(Cypress.env('githubClientId'));
    cy.get('input[type="password"]').type(Cypress.env('githubClientSecret'));
    githubPo.saveButton().expectToBeEnabled();
  });

  it('Can enabled GitHub authentication provider in Rancher', () => {
    cy.login();
    cy.enableGithubAuth().then(() => {
      disableAuth = true;
    });

    authProviderPo.goTo();
    authProviderPo.waitForPage();
    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Active');
    githubPo.bannerContent('div.text').should('contain.text', 'The GitHub authentication provider is currently enabled.');

    // cy.wait(10000);
    // TODO
    // verify server/client id values display
  });

  it('GitHub Auth Login/Logout flow', () => {
    cy.login(undefined, undefined, false, true, true);

    authProviderPo.goTo();
    githubPo.waitForPage();

    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Active');
    githubPo.bannerContent('div.text').should('contain.text', 'The GitHub authentication provider is currently enabled.');

    userMenu.clickMenuItem('Log Out');
    loginPage.waitForPage();

    // check 'Log in with Github' and 'Use a local user' options available
    loginPage.useAuthProvider('Log in with GitHub').isVisible();
    loginPage.switchToLocal().isVisible();

    // 'Log in with Github' - user lands on github auth page
    loginPage.useAuthProvider('Log in with GitHub').click();
    // login to rancher via api
    // cy.loginViaGithubAuth();
    githubSignin(userInfo.user1.username, userInfo.user1.password);

    homePage.waitForPage();

    // check github avatar and username in user menu
    userMenu.userImage().find('.user-image img').then((el) => {
      expect(el).to.have.attr('src').to.include('https://avatars.githubusercontent.com');
      expect(el).to.have.class('avatar-round');
    });
    userMenu.open();
    userMenu.userMenu().find('li.user-info .user-name').should('contain.text', userInfo.user1.username);

    // logout - check success message on screen
    userMenu.clickMenuItem('Log Out');
    loginPage.waitForPage();
    loginPage.loginPageMessage().should('contain.text', 'You\'ve been logged out of Rancher, however you may still be logged in to your single sign-on identity provider.');
  });

  after('clean up', () => {
    if (disableAuth) {
      // ensure GitHub auth is disabled
      cy.disableAuth('v3', 'githubConfigs', 'github');
    }
  });
});

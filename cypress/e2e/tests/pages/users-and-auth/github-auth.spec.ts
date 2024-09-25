import GitHubPo from '@/cypress/e2e/po/edit/auth/github.po';
import AuthProviderPo from '@/cypress/e2e/po/pages/users-and-auth/authProvider.po';
import { LoginPagePo } from '@/cypress/e2e/po/pages/login-page.po';
import HomePagePo from '@/cypress/e2e/po/pages/home.po';
import UserMenuPo from '@/cypress/e2e/po/side-bars/user-menu.po';
import GitHubThirdPartyPo from '@/cypress/e2e/po/third-party-apps/github.po';
import { MEDIUM_TIMEOUT_OPT } from '@/cypress/support/utils/timeouts';

const authProviderPo = new AuthProviderPo('local');
const githubPo = new GitHubPo('local');
const loginPage = new LoginPagePo();
const homePage = new HomePagePo();
const userMenu = new UserMenuPo();
const gitHubThirdPartyPo = new GitHubThirdPartyPo();

let clientSecret: string;
let clientId: string;
let appName = '';
let disableAuth = false;

const userInfo = {
  user1: { username: Cypress.env('githubUser1'), password: Cypress.env('githubPassword1') },
  user2: { username: Cypress.env('githubUser2'), password: Cypress.env('githubPassword2') }
};

function githubSignin(username: string, password: string) {
  cy.url().should('include', 'https://github.com/login');
  gitHubThirdPartyPo.usernameField(username);
  gitHubThirdPartyPo.passwordField(password);
  gitHubThirdPartyPo.signInButton().click();
}

describe('GitHub', { tags: ['@adminUser', '@usersAndAuths', '@jenkins'] }, () => {
  before(() => {
    cy.createE2EResourceName('github').then((name) => {
      appName = name;
    });
  });

  it('Configure OAuth App in GitHub', () => {
    cy.login();

    authProviderPo.goTo();
    authProviderPo.waitForPage();
    authProviderPo.selectGit();
    githubPo.waitForPage();

    githubPo.githubAppLink().click();

    githubSignin(userInfo.user1.username, userInfo.user1.password);
    cy.url().should('include', 'github.com/settings/developers');
    cy.visit('https://github.com/settings/applications/new');
    cy.url().should('include', 'https://github.com/settings/applications/new');
    gitHubThirdPartyPo.appNameField(appName);
    gitHubThirdPartyPo.oauthApplicationUrl(`${ Cypress.env('api') }`);
    gitHubThirdPartyPo.oauthApplicationCallbackUrl(`${ Cypress.env('api') }`);

    cy.intercept('POST', 'https://github.com/settings/applications').as('createGitApp');
    gitHubThirdPartyPo.registerAppButton().click();
    cy.wait('@createGitApp');

    cy.url().should('include', 'github.com/settings/applications');

    cy.contains('div', 'Client ID').next('code').invoke('text').then((text) => {
      clientId = text;
    });

    gitHubThirdPartyPo.generateClientSecret().click();
    gitHubThirdPartyPo.newOauthToken().invoke('text').then((text) => {
      clientSecret = text;
    });
  });

  it('Can enabled GitHub authentication provider in Rancher', () => {
    cy.login();

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
      cy.spy(win, 'open').as('windowOpen');
    });

    githubPo.save();

    cy.wait('@configureTest');

    // github auth popup - sign in
    cy.get('@windowOpen')
      .its('firstCall.returnValue.document')
      .should('have.property', 'location').and('have.property', 'pathname', '/login');

    cy.get('@windowOpen')
      .its('firstCall.returnValue.document')
      .then((newWindow) => {
        cy.wrap(newWindow.body).find('#login_field').type(userInfo.user1.username);
        cy.wrap(newWindow.body).find('#password').type(userInfo.user1.password);
        cy.wrap(newWindow.body).find('input[type="submit"]').contains('Sign in').click();
      });

    // github auth popup - authorize app
    cy.get('@windowOpen')
      .its('firstCall.returnValue.document')
      .should('have.property', 'location').and('have.property', 'pathname', '/login/oauth/authorize');

    cy.get('@windowOpen')
      .its('firstCall.returnValue.document')
      .then((newWindow) => {
        cy.wrap(newWindow.body)
          .find('button[name="authorize"][value="1"]', MEDIUM_TIMEOUT_OPT)
          .should('be.enabled')
          .click();
      });

    cy.wait('@saveConfig', MEDIUM_TIMEOUT_OPT).then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      disableAuth = true;
    });

    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Active');
    githubPo.bannerContent('div.text').should('contain.text', 'The GitHub authentication provider is currently enabled.');

    // TODO
    // verify server/client id values display
  });

  it('GitHub Auth Login/Logout flow', () => {
    cy.login();

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

  it('Can set restrictions and add restricted user', () => {
    cy.login(undefined, undefined, false, false, false, 'GitHub');

    githubSignin(userInfo.user1.username, userInfo.user1.password);

    homePage.waitForPage();

    authProviderPo.goTo();
    githubPo.waitForPage();

    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Active');
    githubPo.bannerContent('div.text').should('contain.text', 'The GitHub authentication provider is currently enabled.');

    // set restriction
    // githubPo.selectLoginCofigOption(2);
    cy.get('span').contains('Restrict access to only the authorized users & groups').click();

    // add github user
    cy.intercept('PUT', '/v3/githubConfigs/github').as('addUser');
    githubPo.addMemberSearch().setOptionAndClick(userInfo.user2.username);
    githubPo.save();
    cy.wait('@addUser').its('response.statusCode').should('eq', 200);
    githubPo.usersAndGroupsArrayListItem(1).should('include.text', userInfo.user2.username);

    userMenu.clickMenuItem('Log Out');
    loginPage.waitForPage();
  });

  it('Can signin as restricted user', () => {
    cy.login(undefined, undefined, false, false, false, 'GitHub');

    githubSignin(userInfo.user2.username, userInfo.user2.password);

    gitHubThirdPartyPo.authorizeButton(MEDIUM_TIMEOUT_OPT);

    // check github avatar and username in user menu
    homePage.waitForPage();
    userMenu.userImage().find('.user-image img').then((el) => {
      expect(el).to.have.attr('src').to.include('https://avatars.githubusercontent.com');
      expect(el).to.have.class('avatar-round');
    });
    userMenu.open();
    userMenu.userMenu().find('li.user-info .user-name').should('contain.text', userInfo.user2.username);

    userMenu.clickMenuItem('Log Out');
    loginPage.waitForPage();
  });

  it('Can disable GitHub authentication provider in Rancher', () => {
    cy.login(undefined, undefined, false, false, false, 'GitHub');

    githubSignin(userInfo.user1.username, userInfo.user1.password);

    cy.intercept('POST', 'v3/githubConfigs/github?action=disable').as('disableAuth');
    cy.intercept('POST', 'v3/tokens?action=logout').as('authError');

    homePage.waitForPage();
    authProviderPo.goTo();
    githubPo.waitForPage();

    githubPo.mastheadTitle().should('contain', 'GitHub');
    githubPo.mastheadTitle().should('contain', 'Active');
    githubPo.bannerContent('div.text').should('contain.text', 'The GitHub authentication provider is currently enabled.');

    githubPo.disable();
    authProviderPo.disableAuthProviderModal().submit('Disable');
    cy.wait('@disableAuth').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      disableAuth = false;
    });
    cy.wait('@authError').its('response.statusCode').should('eq', 401);

    githubPo.bannerContent('span').should('contain.text', 'Unauthorized 401: must authenticate');

    // user should land on login page
    loginPage.waitForPage();

    // 'Log in with Github' option NOT available
    loginPage.useAuthProvider('Log in with GitHub').should('not.exist');
  });

  after('clean up', () => {
    if (disableAuth) {
      // ensure GitHub auth is disabled
      cy.disableAuth('v3', 'githubConfigs', 'github');
    }
  });
});

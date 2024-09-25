/* eslint-disable cypress/no-unnecessary-waiting */
export default class GitHubThirdPartyPo {
  usernameField(text: string) {
    return cy.get('#login_field').should('be.visible').clear().type(text, { force: true, delay: 100 });
  }

  passwordField(text: string) {
    return cy.get('#password').should('be.visible').clear().type(text, { force: true, delay: 100 });
  }

  signInButton() {
    return cy.get('input').contains('Sign in');
  }

  appNameField(text: string) {
    return cy.get('#oauth_application_name').type(text);
  }

  oauthApplicationUrl(text: string) {
    return cy.get('#oauth_application_url').type(text);
  }

  oauthApplicationCallbackUrl(text: string) {
    return cy.get('#oauth_application_callback_url').type(text);
  }

  registerAppButton() {
    return cy.get('button.btn').contains('Register application');
  }

  generateClientSecret() {
    return cy.get('input.btn').contains('Generate a new client secret');
  }

  newOauthToken() {
    return cy.get('#new-oauth-token');
  }

  authorizeButton(options: any) {
    return cy.get('button[name="authorize"][value="1"]', options).should('be.enabled').click();
  }
}

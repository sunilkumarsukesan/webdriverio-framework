import { BrowserUtils as $b } from '../../../utils';
import loginPageLocators from '../../locators/NUS_Portal/LoginPageLocators';
import config from '@utils/configManager';


class LoginPage {
  private get usernameInput() { return loginPageLocators.usernameInput; }
  private get passwordInput() { return loginPageLocators.passwordInput; }
  private get loginButton()   { return loginPageLocators.loginButton; }
  private get welcomeText()   { return loginPageLocators.welcomeText; }

  async login(username: string, password: string) {
    await $b.launchURL(config.portalUrl);
    await $b.clearAndType(this.usernameInput, username);
    await $b.clearAndType(this.passwordInput, password);
    await $b.clickElement(this.loginButton);
  }

  async getWelcomeMessage() {
    return await $b.getElementText(this.welcomeText);
  }
}

export default new LoginPage();

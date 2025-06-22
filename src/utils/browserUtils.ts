import allureReporter from '@wdio/allure-reporter';
import logger from './logger';
import { Status } from 'allure-js-commons';
import { frameworkConfig } from '../utils/configManager';
import { expect as chaiExpect } from 'chai';
import * as path from 'path'; 


const screenshotStrategy = process.env.SCREENSHOT_STRATEGY || 'onFailure';

export async function captureScreenshot(title: string) {
  const screenshot = await browser.takeScreenshot();
  allureReporter.addAttachment(title, Buffer.from(screenshot, 'base64'), 'image/png');
}

async function retryAction(fn: () => Promise<void>, retries = 3, actionName = '') {
  for (let i = 0; i < retries; i++) {
    try {
      await fn();
      return;
    } catch (error) {
      logger.warn(`[WARN] Retry ${i + 1} failed for ${actionName}:`, error instanceof Error ? error.message : error);
      if (i === retries - 1) {
        throw error;
      }
    }
  }
}

export async function launchURL(url: string) {
  const stepName = `Open URL: ${url}`;
  logger.info(`[NAVIGATE] ${stepName}`);

  try {
    allureReporter.startStep(stepName);
    await browser.url(url);

    if (screenshotStrategy === 'always') {
      await captureScreenshot('After Navigation');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    logger.error(`[NAVIGATE][ERROR] ${error instanceof Error ? error.message : String(error)}`);
    await captureScreenshot('Navigation Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function clickElement(locator: string, retries = 3) {
  const stepName = `Click on element: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  try {
    allureReporter.startStep(stepName);
    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForClickable({ timeout: 5000 });
      await element.click();
    }, retries, 'clickElement');

    if (screenshotStrategy === 'always') {
      await captureScreenshot('After Click');
    }
    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    await captureScreenshot('Click Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}


export async function typeText(locator: string, value: string, retries = frameworkConfig.retryCount) {
  const stepName = `Type text "${value}" into element: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  if (!value || value.trim() === '') {
    const msg = `TEXT INPUT SKIPPED: Provided value is empty or null for locator [${locator}]`;
    logger.warn(msg);
    allureReporter.addAttachment('Input Skipped', msg, 'text/plain');
    return;
  }

  try {
    allureReporter.startStep(stepName);

    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForDisplayed({ timeout: frameworkConfig.defaultTimeout });
      await element.clearValue();
      await element.setValue(value);  // Just type, no ENTER
    }, retries, 'typeOnly');

    if (frameworkConfig.screenshotStrategy === 'always') {
      await captureScreenshot('After Type');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    const message = `[ERROR] ${stepName} failed: ${(error as Error).message}`;
    logger.error(message);
    allureReporter.addAttachment('Type Error', message, 'text/plain');
    await captureScreenshot('Type Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function clearAndType(locator: string, value: string, retries = frameworkConfig.retryCount) {
  const stepName = `Clear and type text "${value}" into element: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  try {
    allureReporter.startStep(stepName);

    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForDisplayed({ timeout: frameworkConfig.defaultTimeout });
      await element.clearValue();  // clear first
      await element.setValue(value); // then type
    }, retries, 'clearAndTypeText');

    if (frameworkConfig.screenshotStrategy === 'always') {
      await captureScreenshot('After Clear and Type');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    const message = `[ERROR] ${stepName} failed: ${(error as Error).message}`;
    logger.error(message);
    allureReporter.addAttachment('Error Message', message, 'text/plain');
    await captureScreenshot('Clear and Type Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}


export async function typeAndEnter(locator: string, value: string, retries = frameworkConfig.retryCount) {
  const stepName = `Type text "${value}" and press Enter into element: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  allureReporter.startStep(stepName);

  if (!value || value.trim() === '') {
    const msg = `[ERROR] Invalid input: value is null or empty for locator: ${locator}`;
    logger.error(msg);
    allureReporter.addAttachment('Input Error', msg, 'text/plain');
    await captureScreenshot('Empty Input');
    allureReporter.endStep(Status.FAILED);
    throw new Error(msg);
  }

  try {
    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForDisplayed({ timeout: frameworkConfig.defaultTimeout });
      await element.clearValue();
      await element.setValue(value);
      await browser.keys(['Enter']);
    }, retries, 'typeAndEnter');

    if (frameworkConfig.screenshotStrategy === 'always') {
      await captureScreenshot('After Type and Enter');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    logger.error(`[ERROR] ${stepName} failed: ${(error as Error).message}`);
    await captureScreenshot('Type and Enter Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function typeAndTab(locator: string, data: string, timeout = frameworkConfig.defaultTimeout): Promise<void> {
  const stepName = `Type into element and press TAB: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);
  allureReporter.startStep(stepName);

  if (!data || data.trim() === '') {
    const msg = `TEXT INPUT FAILED: Data is null or empty. Cannot send invalid input to element [${locator}]`;
    logger.error(msg);
    allureReporter.addAttachment('Input Error', msg, 'text/plain');
    await captureScreenshot('Empty Input');
    allureReporter.endStep(Status.FAILED);
    return;
  }

  try {
    const element = await $(locator);
    await element.waitForDisplayed({ timeout });
    await element.clearValue();
    await element.setValue(data);
    await browser.keys('Tab');
    allureReporter.endStep(Status.PASSED);
  } catch (error: any) {
    if (error.name === 'stale element reference') {
      logger.warn(`[ACTION] Element went stale. Retrying: ${locator}`);
      await browser.pause(500);
      try {
        const retryElement = await $(locator);
        await retryElement.setValue(data);
        await browser.keys('Tab');
        allureReporter.endStep(Status.PASSED);
        return;
      } catch (e1) {
        const msg = `TEXT INPUT FAILED: Could not type into element [${locator}] even after retrying. ${e1 instanceof Error ? e1.message : e1}`;
        logger.error(msg);
        await captureScreenshot('Retry Failed - Type and Tab');
        allureReporter.addAttachment('Retry Failure', msg, 'text/plain');
        allureReporter.endStep(Status.FAILED);
        return;
      }
    }

    const msg = `TEXT INPUT ERROR: WebDriverException occurred for element [${locator}]. ${error.message || error}`;
    logger.error(msg);
    await captureScreenshot('Type and Tab Error');
    allureReporter.addAttachment('Exception', msg, 'text/plain');
    allureReporter.endStep(Status.FAILED);
  }
}



//############################## Handling Dropdowns #############################################

export async function selectDropdownByText(locator: string, value: string, retries = frameworkConfig.retryCount) {
  const stepName = `Select '${value}' from dropdown: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  try {
    allureReporter.startStep(stepName);

    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForDisplayed({ timeout: frameworkConfig.defaultTimeout });

      const dropdown = await element.$(`option=${value}`);
      const exists = await dropdown.isExisting();

      if (!exists) {
        throw new Error(`Dropdown option '${value}' not found for locator: ${locator}`);
      }

      await element.selectByVisibleText(value);
    }, retries, 'selectDropdownByText');

    if (frameworkConfig.screenshotStrategy === 'always') {
      await captureScreenshot('After Dropdown Selection');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    const message = `[ERROR] Dropdown selection failed: ${(error as Error).message}`;
    logger.error(message);
    allureReporter.addAttachment('Dropdown Error', message, 'text/plain');
    await captureScreenshot('Dropdown Selection Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function selectDropdownByIndex(locator: string, index: number, retries = frameworkConfig.retryCount) {
  const stepName = `Select option at index ${index} from dropdown: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  try {
    allureReporter.startStep(stepName);

    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForDisplayed({ timeout: frameworkConfig.defaultTimeout });
      await element.selectByIndex(index);
    }, retries, 'selectDropdownByIndex');

    if (frameworkConfig.screenshotStrategy === 'always') {
      await captureScreenshot('After Dropdown Selection by Index');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    const message = `[ERROR] Dropdown selection by index failed: ${(error as Error).message}`;
    logger.error(message);
    allureReporter.addAttachment('Dropdown Index Error', message, 'text/plain');
    await captureScreenshot('Dropdown Selection by Index Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function selectDropdownByValue(locator: string, value: string, retries = frameworkConfig.retryCount) {
  const stepName = `Select option with value "${value}" from dropdown: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  try {
    allureReporter.startStep(stepName);

    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForDisplayed({ timeout: frameworkConfig.defaultTimeout });
      await element.selectByAttribute('value', value);
    }, retries, 'selectDropdownByValue');

    if (frameworkConfig.screenshotStrategy === 'always') {
      await captureScreenshot('After Dropdown Selection by Value');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    const message = `[ERROR] Dropdown selection by value failed: ${(error as Error).message}`;
    logger.error(message);
    allureReporter.addAttachment('Dropdown Value Error', message, 'text/plain');
    await captureScreenshot('Dropdown Selection by Value Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}



//############################## Retreival #############################################

export async function getElementText(locator: string): Promise<string> {
  const stepName = `Get text from element: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  allureReporter.startStep(stepName);

  try {
    const element = await $(locator);
    await element.waitForDisplayed({ timeout: 5000 });
    const text = await element.getText();

    if (screenshotStrategy === 'always') {
      await captureScreenshot('After Get Text');
    }

    allureReporter.endStep(Status.PASSED);
    return text;
  } catch (error) {
    await captureScreenshot(`Get Text Failed: ${locator}`);

    allureReporter.addAttachment(
      'Error Message',
      (error instanceof Error ? error.message : JSON.stringify(error)),
      'text/plain'
    );

    logger.error(`[ERROR] ${stepName} failed: ${(error as Error).message}`);
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function getAttribute(
  locator: string,
  attribute: string,
  retries = 3
): Promise<string> {
  const stepName = `Get attribute "${attribute}" from element: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  allureReporter.startStep(stepName);

  try {
    let attrValue = '';
    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForDisplayed({ timeout: 5000 });
      attrValue = await element.getAttribute(attribute);

      // Fallback: Try DOM property if attribute is null/undefined
      if (!attrValue) {
        attrValue = await browser.execute(
          (el, attr) => (el as Record<string, any>)?.[attr] ?? '',
          element,
          attribute
        );
      }
    }, retries, 'getAttribute');

    allureReporter.endStep(Status.PASSED);
    return attrValue || ''; // Always return a string
  } catch (error) {
    const message = `[ERROR] Failed to get attribute "${attribute}" from ${locator}: ${
      error instanceof Error ? error.message : String(error)
    }`;

    logger.error(message);
    allureReporter.addAttachment('Attribute Error', message, 'text/plain');
    await captureScreenshot(`Get Attribute Failed: ${attribute}`);
    allureReporter.endStep(Status.FAILED);

    return ''; // Safe fallback
  }
}


//############################## Assertions #############################################

export async function isVisible(locator: string, timeout = 5000, retries = 3): Promise<boolean> {
  const stepName = `Check visibility of element: ${locator}`;
  logger.info(`[CHECK] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    let isDisplayed = false;

    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForExist({ timeout });
      isDisplayed = await element.isDisplayed();
    }, retries, 'isVisible');

    logger.info(`[CHECK] ${locator} is ${isDisplayed ? 'visible' : 'not visible'}`);
    allureReporter.endStep(Status.PASSED);
    return isDisplayed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[CHECK][ERROR] ${stepName} failed: ${message}`);
    await captureScreenshot('Visibility Check Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function verifyDisappeared(locator: string, timeout = frameworkConfig.defaultTimeout): Promise<boolean> {
  const stepName = `Verify element has disappeared: ${locator}`;
  logger.info(`[VERIFY] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    const element = await $(locator);
    const result = await element.waitForDisplayed({ timeout, reverse: true });

    if (!result) {
      const msg = `Element "${locator}" is still visible after timeout.`;
      logger.error(`[VERIFY][FAILURE] ${msg}`);
      await captureScreenshot('Disappearance Check Failed');
      allureReporter.addAttachment('Disappearance Failure', msg, 'text/plain');
      allureReporter.endStep(Status.FAILED);
      return false;
    }

    allureReporter.endStep(Status.PASSED);
    return true;
  } catch (error: any) {
    if (error.name === 'stale element reference') {
      logger.info(`[VERIFY] Element is stale, considered disappeared: ${locator}`);
      allureReporter.endStep(Status.PASSED);
      return true;
    }

    const errMsg = `Failed while waiting for element to disappear: ${error.message || error}`;
    logger.error(`[VERIFY][ERROR] ${errMsg}`);
    await captureScreenshot('Unexpected Error - Disappearance');
    allureReporter.addAttachment('Disappearance Exception', errMsg, 'text/plain');
    allureReporter.endStep(Status.FAILED);
    return false;
  }
}

export async function verifyEnabled(locator: string, timeout = frameworkConfig.defaultTimeout): Promise<boolean> {
  const stepName = `Verify element is enabled: ${locator}`;
  logger.info(`[VERIFY] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    const element = await $(locator);
    await element.waitForExist({ timeout });

    const isEnabled = await element.isEnabled();

    if (!isEnabled) {
      const msg = `ELEMENT NOT ENABLED: The element [${locator}] is present but disabled.`;
      logger.error(msg);
      await captureScreenshot('Element Not Enabled');
      allureReporter.addAttachment('Enabled Check Failure', msg, 'text/plain');
      allureReporter.endStep(Status.FAILED);
      return false;
    }

    allureReporter.endStep(Status.PASSED);
    return true;
  } catch (error: any) {
    if (error.name === 'stale element reference') {
      logger.warn(`[VERIFY] Element went stale. Retrying: ${locator}`);
      await browser.pause(500);
      try {
        const element = await $(locator);
        const isEnabled = await element.isEnabled();
        allureReporter.endStep(Status.PASSED);
        return isEnabled;
      } catch (innerErr) {
        const msg = `Retry failed after stale element: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`;
        logger.error(msg);
        await captureScreenshot('Verify Enabled Retry Failed');
        allureReporter.addAttachment('Retry Failure', msg, 'text/plain');
        allureReporter.endStep(Status.FAILED);
        return false;
      }
    }

    const msg = `ELEMENT CHECK FAILED: ${error.message || error}`;
    logger.error(msg);
    await captureScreenshot('Verify Enabled Failed');
    allureReporter.addAttachment('Exception', msg, 'text/plain');
    allureReporter.endStep(Status.FAILED);
    return false;
  }
}

export async function verifySelected(locator: string, timeout = frameworkConfig.defaultTimeout): Promise<boolean> {
  const stepName = `Verify element is selected: ${locator}`;
  logger.info(`[VERIFY] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    const element = await $(locator);
    await element.waitForExist({ timeout });

    const isSelected = await element.isSelected();

    if (!isSelected) {
      const msg = `ELEMENT NOT SELECTED: The element [${locator}] is present but not selected.`;
      logger.error(msg);
      await captureScreenshot('Element Not Selected');
      allureReporter.addAttachment('Selected Check Failure', msg, 'text/plain');
      allureReporter.endStep(Status.FAILED);
      return false;
    }

    allureReporter.endStep(Status.PASSED);
    return true;
  } catch (error: any) {
    if (error.name === 'stale element reference') {
      logger.warn(`[VERIFY] Element went stale. Retrying: ${locator}`);
      await browser.pause(500);
      try {
        const element = await $(locator);
        const isSelected = await element.isSelected();
        allureReporter.endStep(Status.PASSED);
        return isSelected;
      } catch (innerErr) {
        const msg = `Retry failed after stale element: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`;
        logger.error(msg);
        await captureScreenshot('Verify Selected Retry Failed');
        allureReporter.addAttachment('Retry Failure', msg, 'text/plain');
        allureReporter.endStep(Status.FAILED);
        return false;
      }
    }

    const msg = `ELEMENT CHECK FAILED: ${error.message || error}`;
    logger.error(msg);
    await captureScreenshot('Verify Selected Failed');
    allureReporter.addAttachment('Exception', msg, 'text/plain');
    allureReporter.endStep(Status.FAILED);
    return false;
  }
}


export async function verifyExactText(locator: string, expectedText: string, retries = frameworkConfig.retryCount): Promise<boolean> {
  const stepName = `Verify element text equals: "${expectedText}" for locator: ${locator}`;
  logger.info(`[ASSERT] ${stepName}`);

  try {
    allureReporter.startStep(stepName);

    let actualText = '';
    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForDisplayed({ timeout: frameworkConfig.defaultTimeout });
      actualText = await element.getText();
      chaiExpect(actualText, 'Text mismatch for locator: ${locator}').to.equal(expectedText);
    }, retries, 'verifyExactText');

    allureReporter.endStep(Status.PASSED);
    return true;
  } catch (error) {
    const actualTextMsg = (error instanceof Error && error.message.includes('expected')) ? error.message : '';
    const message = `[ASSERT][ERROR] Expected "${expectedText}" but got "${actualTextMsg}"`;
    logger.error(message);
    allureReporter.addAttachment('Text Verification Error', message, 'text/plain');
    await captureScreenshot('Text Verification Failed');
    allureReporter.endStep(Status.FAILED);
    return false;
  }
}

export async function verifyPartialText(locator: string, expectedText: string): Promise<boolean> {
  const stepName = `Verify partial text "${expectedText}" is present in element: ${locator}`;
  logger.info(`[VERIFY] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    const element = await $(locator);
    await element.waitForDisplayed({ timeout:  frameworkConfig.defaultTimeout });
    const actualText = await element.getText();

    chaiExpect(actualText).to.contain(
      expectedText,
      `Expected partial text "${expectedText}" not found in actual text "${actualText}"`
    );

    allureReporter.endStep(Status.PASSED);
    return true;
  } catch (error) {
    logger.error(`[VERIFY][ERROR] ${stepName}: ${error instanceof Error ? error.message : String(error)}`);
    await captureScreenshot('Partial Text Verification Failed');
    allureReporter.addAttachment(
      'Verification Failure',
      error instanceof Error ? error.message : JSON.stringify(error),
      'text/plain'
    );
    allureReporter.endStep(Status.FAILED);
    return false;
  }
}


export async function verifyUrl(expectedUrl: string): Promise<boolean> {
  try {
    const currentUrl = await browser.getUrl();

    if (currentUrl === expectedUrl) {
      logger.info(`[VERIFY] Current URL matches expected: ${expectedUrl}`);
      return true;
    } else {
      const message = `URL Mismatch: Expected [${expectedUrl}], but found [${currentUrl}]`;
      logger.error(message);
      allureReporter.addAttachment('URL Mismatch', message, 'text/plain');
      return false;
    }
  } catch (error: any) {
    const message = `URL Verification Failed: Could not fetch or compare URL`;
    logger.error(message, error);
    allureReporter.addAttachment('URL Verification Error', `${message}\n${error.message}`, 'text/plain');
    return false;
  }
}


export async function verifyTitle(expectedTitle: string): Promise<boolean> {
  try {
    const actualTitle = await browser.getTitle();

    if (actualTitle === expectedTitle) {
      logger.info(`[VERIFY] Page title matches expected: ${expectedTitle}`);
      return true;
    } else {
      const message = `PAGE TITLE MISMATCH: Expected [${expectedTitle}], but found [${actualTitle}]`;
      logger.error(message);
      allureReporter.addAttachment('Title Mismatch', message, 'text/plain');
      return false;
    }
  } catch (error: any) {
    const message = `TITLE VERIFICATION ERROR: Unable to retrieve or compare page title.`;
    logger.error(message, error);
    allureReporter.addAttachment('Title Verification Error', `${message}\n${error.message}`, 'text/plain');
    return false;
  }
}



//############################## waits #############################################

export async function waitForVisible(locator: string, timeout = frameworkConfig.defaultTimeout, retries = frameworkConfig.retryCount) {
  const stepName = `Wait for element to be visible: ${locator}`;
  logger.info(`[WAIT] ${stepName}`);

  try {
    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForDisplayed({ timeout });
    }, retries, 'waitForVisible');
  } catch (error) {
    allureReporter.startStep(stepName);

    let message = '[WAIT][ERROR] Unknown error during visibility check';
    if (error instanceof Error) {
      message = error.message;

      if (message.includes('stale element reference')) {
        message = `VISIBILITY ERROR: Element [${locator}] became stale before interaction. Consider retrying.`;
      } else if (message.includes('element ("' + locator + '") still not displayed')) {
        message = `VISIBILITY TIMEOUT: Element [${locator}] did not appear within ${timeout}ms.`;
      } else {
        message = `VISIBILITY CHECK FAILED: ${message}`;
      }
    }

    logger.error(message);
    allureReporter.addAttachment('Visibility Failure', message, 'text/plain');
    await captureScreenshot('Visibility Check Failed');

    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}


export async function waitForClickable(locator: string, timeout = frameworkConfig.defaultTimeout, retries = frameworkConfig.retryCount) {
  const stepName = `Wait for element to be clickable: ${locator}`;
  logger.info(`[WAIT] ${stepName}`);

  try {
    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForClickable({ timeout });
    }, retries, 'waitForClickable');
  } catch (error) {
    allureReporter.startStep(stepName);

    let message = '[WAIT][ERROR] Unknown error during clickable check';
    if (error instanceof Error) {
      message = error.message;

      if (message.includes('stale element reference')) {
        message = `STALE ELEMENT ERROR: Element [${locator}] became stale before interaction. Consider retrying.`;
      } else if (message.includes('element ("' + locator + '") still not clickable')) {
        message = `TIMEOUT ERROR: Element [${locator}] did not become clickable within ${timeout}ms.`;
      } else {
        message = `CLICKABILITY CHECK FAILED: ${message}`;
      }
    }

    logger.error(message);
    allureReporter.addAttachment('Clickable Failure', message, 'text/plain');
    await captureScreenshot('Clickability Check Failed');

    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}


export async function waitForDisappearance(
  locator: string,
  timeout = frameworkConfig.defaultTimeout
): Promise<void> {
  const stepName = `Wait for element to disappear: ${locator}`;
  logger.info(`[WAIT] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    const element = await $(locator);
    const isGone = await element.waitForDisplayed({ timeout, reverse: true });

    if (!isGone) {
      const msg = `TIMEOUT: Element [${locator}] did not disappear within ${timeout} ms.`;
      logger.error(msg);
      allureReporter.addAttachment('Disappearance Failure', msg, 'text/plain');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error: any) {
    const errMsg = `UNEXPECTED ERROR: Failed while waiting for element [${locator}] to disappear.`;
    logger.error(errMsg, error);
    allureReporter.addAttachment('Wait for Disappearance Error', `${errMsg}\n${error.message}`, 'text/plain');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}



//############################## Alerts #############################################

export async function acceptAlert(): Promise<void> {
  const stepName = 'Accept Alert';
  logger.info(`[ACTION] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    await browser.waitUntil(
      async () => {
        try {
          await browser.getAlertText();
          return true;
        } catch {
          return false;
        }
      },
      {
        timeout: frameworkConfig.defaultTimeout,
        timeoutMsg: 'Alert was not present within timeout period',
      }
    );

    const alertText = await browser.getAlertText();
    logger.info(`[ALERT] Text: ${alertText}`);
    await browser.acceptAlert();

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[ALERT][ERROR] ${errMsg}`);
    allureReporter.addAttachment('Alert Accept Failed', errMsg, 'text/plain');
    await captureScreenshot('Accept Alert Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function dismissAlert(): Promise<void> {
  const stepName = 'Dismiss Alert';
  logger.info(`[ACTION] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    await browser.waitUntil(
      async () => {
        try {
          await browser.getAlertText();
          return true;
        } catch {
          return false;
        }
      },
      {
        timeout: frameworkConfig.defaultTimeout,
        timeoutMsg: 'Alert was not present within timeout period',
      }
    );

    const alertText = await browser.getAlertText();
    logger.info(`[ALERT] Text: ${alertText}`);
    await browser.dismissAlert();

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[ALERT][ERROR] ${errMsg}`);
    allureReporter.addAttachment('Alert Dismiss Failed', errMsg, 'text/plain');
    await captureScreenshot('Dismiss Alert Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function getAlertText(): Promise<string> {
  const stepName = 'Get Alert Text';
  logger.info(`[ACTION] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    await browser.waitUntil(
      async () => {
        try {
          await browser.getAlertText();
          return true;
        } catch {
          return false;
        }
      },
      {
        timeout: frameworkConfig.defaultTimeout,
        timeoutMsg: 'Alert was not present within timeout period',
      }
    );

    const alertText = await browser.getAlertText();
    logger.info(`[ALERT] Text Retrieved: ${alertText}`);
    allureReporter.endStep(Status.PASSED);
    return alertText;

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[ALERT][ERROR] ${errMsg}`);
    allureReporter.addAttachment('Alert Text Retrieval Failed', errMsg, 'text/plain');
    await captureScreenshot('Get Alert Text Failed');
    allureReporter.endStep(Status.FAILED);
    return ''; // Return empty if failed, just like your Java method
  }
}


export async function typeAlert(data: string): Promise<void> {
  const stepName = `Type text into alert: "${data}"`;
  logger.info(`[ALERT] ${stepName}`);
  allureReporter.startStep(stepName);

  if (!data || data.trim() === '') {
    const msg = 'TEXT INPUT FAILED: Data is null or empty. Cannot send invalid input to the alert';
    logger.error(msg);
    allureReporter.addAttachment('Alert Input Error', msg, 'text/plain');
    allureReporter.endStep(Status.FAILED);
    throw new Error(msg);
  }

  try {
    await browser.waitUntil(
      async () => {
        try {
          await browser.getAlertText(); // Just to check if alert exists
          return true;
        } catch {
          return false;
        }
      },
      {
        timeout: frameworkConfig.defaultTimeout,
        timeoutMsg: 'Alert was not present within timeout period',
      }
    );

    await browser.sendAlertText(data);
    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[ALERT][ERROR] ${errMsg}`);
    allureReporter.addAttachment('Type Alert Failed', errMsg, 'text/plain');
    await captureScreenshot('Type Alert Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

//############################## Windows #############################################

export async function switchToWindow(index: number): Promise<void> {
  const stepName = `Switch to window with index: ${index}`;
  logger.info(`[WINDOW] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    const windowHandles = await browser.getWindowHandles();

    if (index < 0 || index >= windowHandles.length) {
      const msg = `WINDOW NOT FOUND: No window exists at index [${index}]. Available handles: ${windowHandles.length}`;
      logger.error(msg);
      allureReporter.addAttachment('Window Switch Error', msg, 'text/plain');
      allureReporter.endStep(Status.FAILED);
      throw new Error(msg);
    }

    await browser.switchToWindow(windowHandles[index]);
    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[WINDOW][ERROR] ${errMsg}`);
    allureReporter.addAttachment('Window Switch Failed', errMsg, 'text/plain');
    await captureScreenshot('Switch Window Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}


export async function switchToWindowByTitle(title: string): Promise<boolean> {
  const stepName = `Switch to window with title: "${title}"`;
  logger.info(`[WINDOW] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    const windowHandles = await browser.getWindowHandles();

    for (const handle of windowHandles) {
      await browser.switchToWindow(handle);
      const currentTitle = await browser.getTitle();
      if (currentTitle === title) {
        logger.info(`[WINDOW] Switched to window with matching title: "${title}"`);
        allureReporter.endStep(Status.PASSED);
        return true;
      }
    }

    const msg = `The window with title "${title}" was not found.`;
    logger.error(msg);
    allureReporter.addAttachment('Window Title Not Found', msg, 'text/plain');
    allureReporter.endStep(Status.FAILED);
    return false;

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[WINDOW][ERROR] ${errMsg}`);
    allureReporter.addAttachment('Switch to Window by Title Failed', errMsg, 'text/plain');
    await captureScreenshot('Switch To Title Failed');
    allureReporter.endStep(Status.FAILED);
    return false;
  }
}


//############################## Frames #############################################

export async function switchToFrame(index: number): Promise<void> {
  const stepName = `Switch to frame with index: ${index}`;
  logger.info(`[ACTION] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    await browser.pause(100); // Optional wait like in your Java code

    const frames = await $$('iframe, frame');
    const frameCount = frames.length;

    if (index < 0 || index >= await frameCount) {
      throw new Error(`FRAME NOT FOUND: Frame index [${index}] is out of range. Found ${frameCount} frames.`);
    }

    await browser.switchFrame(frames[index]);

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown frame switch error';
    logger.error(`[FRAME SWITCH ERROR] ${message}`);
    await captureScreenshot('Frame Switch Failed');
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function switchToFrameByLocator(locator: string): Promise<void> {
  try {
    const element = await $(locator);
    await element.waitForExist({ timeout: frameworkConfig.defaultTimeout });

    await browser.switchFrame(element);
    logger.info(`[FRAME] Switched to frame using locator: ${locator}`);
  } catch (error: any) {
    const message = error.name === 'no such frame'
      ? `FRAME NOT FOUND: Unable to switch to frame using locator: ${locator}. It may not exist or is not available.`
      : `UNEXPECTED ERROR: Issue occurred while switching to frame using locator: ${locator}`;

    logger.error(message, error);
    allureReporter.addAttachment('Frame Switch Error', `${message}\n${error.message}`, 'text/plain');
    throw error;
  }
}

export async function switchToFrameUsingXPath(xpath: string): Promise<void> {
  try {
    const frame = await $(`xpath=${xpath}`);
    await frame.waitForExist({ timeout: frameworkConfig.defaultTimeout  });

    await browser.switchFrame(frame);
    logger.info(`[FRAME] Switched to frame using XPath: ${xpath}`);
  } catch (error: any) {
    const message = error.name === 'no such frame'
      ? `FRAME NOT FOUND: Unable to switch to frame with XPath: ${xpath}. It may not exist or is not available at this moment.`
      : `UNEXPECTED ERROR: Failed to switch to frame with XPath: ${xpath}`;

    logger.error(message, error);
    allureReporter.addAttachment('Frame Switch Error', `${message}\n${error.message}`, 'text/plain');
    throw error;
  }
}

export async function switchToFrameByIdOrName(idOrName: string): Promise<void> {
  try {
    await browser.switchFrame(idOrName);
    logger.info(`[FRAME] Switched to frame using id/name: ${idOrName}`);
  } catch (error: any) {
    const message = error.name === 'no such frame'
      ? `FRAME NOT FOUND: Unable to switch to frame with id/name: ${idOrName}. It may not exist or is not available at this moment.`
      : `UNEXPECTED ERROR: Failed to switch to frame with id/name: ${idOrName}`;

    logger.error(message, error);
    allureReporter.addAttachment('Frame Switch Error', `${message}\n${error.message}`, 'text/plain');
    throw error;
  }
}


export async function switchToParentFrame(): Promise<void> {
  try {
    await browser.switchToParentFrame();
    logger.info('[FRAME] Switched back to default content');
  } catch (error: any) {
    const message = `FRAME SWITCH FAILED: Unable to switch back to default content. Possible reasons: invalid frame state or browser issue.`;
    logger.error(message, error);
    allureReporter.addAttachment('Default Frame Switch Error', `${message}\n${error.message}`, 'text/plain');
    throw error;
  }
}

//############################## File Uloads #############################################

export async function uploadFileToInput(selector: string, relativeFilePath: string): Promise<void> {
  const absolutePath = path.resolve(__dirname, `../resources/upload/${relativeFilePath}`);
  const stepName = `Upload file [${relativeFilePath}] to element [${selector}]`;
  logger.info(`[ACTION] ${stepName}`);
  allureReporter.startStep(stepName);

  try {
    const remoteFilePath = await browser.uploadFile(absolutePath);
    const input = await $(selector);
    await input.waitForDisplayed({ timeout: 5000 });
    await input.setValue(remoteFilePath);

    allureReporter.endStep(Status.PASSED);
  } catch (err: any) {
    logger.error(`UPLOAD FAILED: ${err.message}`);
    allureReporter.addAttachment('Upload Error', err.message, 'text/plain');
    allureReporter.endStep(Status.FAILED);
    throw err;
  }
}

//############################## Actions #############################################

export async function moveToElement(locator: string, retries = 2) {
  const stepName = `Move mouse to element: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  try {
    allureReporter.startStep(stepName);
    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForDisplayed({ timeout: frameworkConfig.defaultTimeout   });
      await element.moveTo();
    }, retries, 'moveToElement');

    if (screenshotStrategy === 'always') {
      await captureScreenshot('After Move To Element');
    }
    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    await captureScreenshot('Move To Element Failed');
    logger.error(`[FAILURE] ${stepName} | ${error}`);
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function dragAndDropElement(sourceLocator: string, targetLocator: string, retries = 2) {
  const stepName = `Drag element ${sourceLocator} and drop on ${targetLocator}`;
  logger.info(`[ACTION] ${stepName}`);

  try {
    allureReporter.startStep(stepName);

    await retryAction(async () => {
      const source = await $(sourceLocator);
      const target = await $(targetLocator);

      await source.waitForDisplayed({ timeout: frameworkConfig.defaultTimeout    });
      await target.waitForDisplayed({ timeout: frameworkConfig.defaultTimeout    });

      await source.dragAndDrop(target);
    }, retries, 'dragAndDrop');

    if (screenshotStrategy === 'always') {
      await captureScreenshot('After Drag and Drop');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    await captureScreenshot('Drag and Drop Failed');
    logger.error(`[FAILURE] ${stepName} | ${error}`);
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function contextClick(locator: string, retries = 2) {
  const stepName = `Right-click (contextClick) on element: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  try {
    allureReporter.startStep(stepName);

    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForClickable({ timeout: frameworkConfig.defaultTimeout });
      await element.click({ button: 'right' });
    }, retries, 'contextClick');

    if (screenshotStrategy === 'always') {
      await captureScreenshot('After Context Click');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    await captureScreenshot('Context Click Failed');
    logger.error(`[FAILURE] ${stepName} | ${error}`);
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function hoverAndClick(locator: string, retries = 2) {
  const stepName = `Hover and click on element: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  try {
    allureReporter.startStep(stepName);

    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForClickable({ timeout:  frameworkConfig.defaultTimeout });
      await element.moveTo();
      await browser.pause(500); // mimic hover pause
      await element.click();
    }, retries, 'hoverAndClick');

    if (screenshotStrategy === 'always') {
      await captureScreenshot('After Hover Click');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    await captureScreenshot('Hover Click Failed');
    logger.error(`[FAILURE] ${stepName} | ${error}`);
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}

export async function doubleClick(locator: string, retries = 2) {
  const stepName = `Double click on element: ${locator}`;
  logger.info(`[ACTION] ${stepName}`);

  try {
    allureReporter.startStep(stepName);

    await retryAction(async () => {
      const element = await $(locator);
      await element.waitForClickable({ timeout: frameworkConfig.defaultTimeout });
      await element.doubleClick();
    }, retries, 'doubleClick');

    if (screenshotStrategy === 'always') {
      await captureScreenshot('After Double Click');
    }

    allureReporter.endStep(Status.PASSED);
  } catch (error) {
    await captureScreenshot('Double Click Failed');
    logger.error(`[FAILURE] ${stepName} | ${error}`);
    allureReporter.endStep(Status.FAILED);
    throw error;
  }
}






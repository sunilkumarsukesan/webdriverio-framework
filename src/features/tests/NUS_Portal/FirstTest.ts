import { getExcelData } from '../../../utils/dataUtils';
import { LoginPage } from '@pages/NUS_Portal';

describe('Login Test', () => {
  let testData: Record<string, string>[];

  before(() => {
    testData = getExcelData('loginTestData.xlsx', 'LoginTestData');
  });

  it('Successful login', async function () {
    await LoginPage.login(testData[0].username, testData[0].password);
    const msg = await LoginPage.getWelcomeMessage();
    console.log('Login welcome message:', msg);
  });

   it('Unsuccessful login', async function () {
    await LoginPage.login(testData[1].username, testData[1].password);
    //const msg = await LoginPage.getWelcomeMessage();
    //console.log('Login welcome message:', msg);
  });
});
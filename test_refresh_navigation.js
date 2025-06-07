/**
 * Test script to validate refresh behavior in the Royal Care Frontend
 * This script checks if refreshing pages redirects to /dashboard incorrectly
 */

import { Builder, By, until } from 'selenium-webdriver';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';

describe('Page Refresh Navigation Tests', function() {
  let driver;
  const baseUrl = 'http://localhost:5173';
  
  // Test login credentials
  const testCredentials = {
    username: 'testuser',
    password: 'TestPassword123!'
  };

  before(async function() {
    this.timeout(30000);
    
    // Initialize WebDriver
    driver = await new Builder()
      .forBrowser('chrome')
      .build();
      
    // Login first
    await driver.get(`${baseUrl}/`);
    
    // Perform login
    await driver.findElement(By.name('username')).sendKeys(testCredentials.username);
    await driver.findElement(By.name('password')).sendKeys(testCredentials.password);
    await driver.findElement(By.css('button[type="submit"]')).click();
    
    // Wait for successful login
    await driver.wait(until.urlContains('/dashboard'), 10000);
  });

  after(async function() {
    if (driver) {
      await driver.quit();
    }
  });

  it('should stay on scheduling page after refresh', async function() {
    this.timeout(15000);
    
    // Navigate to scheduling page
    await driver.get(`${baseUrl}/dashboard/scheduling`);
    await driver.wait(until.urlContains('/dashboard/scheduling'), 5000);
    
    const urlBeforeRefresh = await driver.getCurrentUrl();
    console.log('URL before refresh:', urlBeforeRefresh);
    
    // Refresh the page
    await driver.navigate().refresh();
    
    // Wait for page to load after refresh
    await driver.sleep(2000);
    
    const urlAfterRefresh = await driver.getCurrentUrl();
    console.log('URL after refresh:', urlAfterRefresh);
    
    // Check if URL stayed the same
    expect(urlAfterRefresh).to.equal(urlBeforeRefresh);
    expect(urlAfterRefresh).to.include('/dashboard/scheduling');
  });

  it('should stay on operator dashboard after refresh', async function() {
    this.timeout(15000);
    
    // Navigate to main dashboard
    await driver.get(`${baseUrl}/dashboard`);
    await driver.wait(until.urlContains('/dashboard'), 5000);
    
    const urlBeforeRefresh = await driver.getCurrentUrl();
    console.log('URL before refresh:', urlBeforeRefresh);
    
    // Refresh the page
    await driver.navigate().refresh();
    
    // Wait for page to load after refresh
    await driver.sleep(2000);
    
    const urlAfterRefresh = await driver.getCurrentUrl();
    console.log('URL after refresh:', urlAfterRefresh);
    
    // Check if URL stayed the same
    expect(urlAfterRefresh).to.equal(urlBeforeRefresh);
  });

  it('should stay on availability manager after refresh', async function() {
    this.timeout(15000);
    
    // Navigate to availability manager
    await driver.get(`${baseUrl}/dashboard/availability`);
    await driver.wait(until.urlContains('/dashboard/availability'), 5000);
    
    const urlBeforeRefresh = await driver.getCurrentUrl();
    console.log('URL before refresh:', urlBeforeRefresh);
    
    // Refresh the page
    await driver.navigate().refresh();
    
    // Wait for page to load after refresh
    await driver.sleep(2000);
    
    const urlAfterRefresh = await driver.getCurrentUrl();
    console.log('URL after refresh:', urlAfterRefresh);
    
    // Check if URL stayed the same
    expect(urlAfterRefresh).to.equal(urlBeforeRefresh);
    expect(urlAfterRefresh).to.include('/dashboard/availability');
  });

  it('should stay on profile page after refresh', async function() {
    this.timeout(15000);
    
    // Navigate to profile page
    await driver.get(`${baseUrl}/dashboard/profile`);
    await driver.wait(until.urlContains('/dashboard/profile'), 5000);
    
    const urlBeforeRefresh = await driver.getCurrentUrl();
    console.log('URL before refresh:', urlBeforeRefresh);
    
    // Refresh the page
    await driver.navigate().refresh();
    
    // Wait for page to load after refresh
    await driver.sleep(2000);
    
    const urlAfterRefresh = await driver.getCurrentUrl();
    console.log('URL after refresh:', urlAfterRefresh);
    
    // Check if URL stayed the same
    expect(urlAfterRefresh).to.equal(urlBeforeRefresh);
    expect(urlAfterRefresh).to.include('/dashboard/profile');
  });
});

# sitbot

![sitbot screenshot](http://f.cl.ly/items/3h2I3f1t303T3Z2X3M1D/Screen%20Shot%202015-05-05%20at%2012.22.05%20AM.png)

## Download

[Click here](http://cl.ly/arfU) to download the latest version.

## Installation (for Google Chrome Version 67.0.3396.99)

1. Download the extension. It will be saved as `sitbot.crx`

2. Go to chrome://extensions/ and check the box for Developer mode in the top right. Refresh.

3. Use a [CRX Extractor app](http://crxextractor.com/) to unpack the CRX file and turn it into a ZIP file.

4. Locate the ZIP file on your computer and unzip it.

5. Go back to the chrome://extensions/ page and click the **LOAD UNPACKED** button and select the unzipped folder for your extension to install it.

## Usage

### Searching GitHub

Fill in the fields and click the `Search GitHub` button.

The `Language` field is optional.

### Scraping GitHub profiles

**Sign in to GitHub.** Or else you will be rate limited and sitbot won't work.

Once you are on a GitHub search results page, click `Start Scraping`.

You can move the mouse around, but do not click anywere. Unfortunately, this causes the extension to close and stop scraping. This might be fixed in a future version.

When sitbot is done, you'll be able to download the scraped results to a `.csv` file. That file can then be imported into a Google Spreadsheet.

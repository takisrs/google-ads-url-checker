# Google Ads script

A google ads script, that checks ads' destination url and pause the ad if a "bad" response (ex 404) detected.

## Configuration
You should consider configuring the below variables before activate the script:   

```javascript
/************************/
/***** URL CHECKING *****/
/************************/
/**
 * The response codes of the target url that will cause to ad pausing
 */
var BAD_RESPONSE_CODES = [404, 301];

/**
 * How may times to perform a request in the target url if it keeps failing
 */
var NUM_OF_TRIES = 4;

/**
 * Pause time between the retries
 */
var SLEEP_TIME_FOR_RETRY = 250;

/**
 * If the script has to follow any redirect of the target url if it exists
 */
var FOLLOW_REDIRECTS = false;

/**
 * Filter the ads to be check, by providing a url' part to be checked against ad's target url
 */
var AD_URL_FILTER = "/frontend/deals/view/";

/************************/
/****** SPREADSHEET *****/
/************************/
/**
 * Google spreadsheet url to keep the logs
 */
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1nSZ00U-S9YOnxjqZKOSTrPIIBu3esxcLcdIfe1EXWwE/edit?usp=sharing';

/**
 * If logging to shreadsheet is enabled or not
 */
var SAVE_RESULTS_TO_SPREADSHEET = true;

/**
 * The name of the spreadsheet tab where the results will be logging
 */
var RESULTS_SHEET_NAME = 'results';

/**
 * The name of the spreadsheet tab where the general logs will be kept
 */
var LOGS_SHEET_NAME = 'logs';


/************************/
/********* EMAIL ********/
/************************/
/**
 * If an email will be send in case the script perform any action
 */
var SEND_EMAIL = true;

/**
 * Email recipients
 */
var RECIPIENTS = ['takispadaz@gmail.com'];

/**
 * The subject of the email
 */
var SUBJECT = "Google Ads // Paused ads";


/************************/
/***** RUNTIME VARS *****/
/************************/
/**
 * If the dry run of the script is enabled. If that's the case, the script will not submit any action.
 */
var DRY_RUN = true;

/**
 * An identifier for each script execution
 */
var TASK_ID = '#PAUSE-' + new Date().toISOString().slice(0, 19).replace('T', ' ');

/**
 * The label to apply on each ad that get paused
 */
var LABEL_TO_APPLY = 'AUTO PAUSED AD';
```


If you want to restrict the ads that will get checked on each script execution, you could modify appropriately the below code part:
```javascript
var AdsIterator = AdWordsApp.ads()
    .withCondition("CreativeFinalUrls CONTAINS '"+AD_URL_FILTER+"'")
    .withCondition("Status = ENABLED")
    .withCondition("AdGroupStatus = ENABLED")
    .withCondition("CampaignStatus = ENABLED")
    .get();
```
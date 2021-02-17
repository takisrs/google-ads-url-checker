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

/**
 * An array to keep the results
 */
var RESULTS = [];


/**
 * Main fn
 */
function main() {
    log('Start Execution', true);

    checkLabel();

    // Modify below to get only the ads you want
    var AdsIterator = AdWordsApp.ads()
        .withCondition("CreativeFinalUrls CONTAINS '"+AD_URL_FILTER+"'")
        .withCondition("Status = ENABLED")
        .withCondition("AdGroupStatus = ENABLED")
        .withCondition("CampaignStatus = ENABLED")
        .get();

    if (AdsIterator.totalNumEntities() === 0) {
        log('No ads found', true);
    } else {
        var totalAds = AdsIterator.totalNumEntities();
        var counter = 0;

        log('Found ' + totalAds + ' ads', true);

        while (AdsIterator.hasNext()) {
            counter++;

            var Ad = AdsIterator.next();

            var responseCode = requestUrl(Ad.urls().getFinalUrl());

            if (BAD_RESPONSE_CODES.indexOf(responseCode) != -1) {
                var action = 'PAUSE';

                if (!DRY_RUN) {
                    Ad.applyLabel(LABEL_TO_APPLY);
                    Ad.pause();
                }
            } else {
                var action = '-';
            }

            var logItem = {
                "id": Ad.getId(),
                "campaign": Ad.getCampaign().getName(),
                "group": Ad.getAdGroup().getName(),
                "url": Ad.urls().getFinalUrl(),
                "response": responseCode,
                "action": action
            };

            log(counter + '/' + totalAds + ' [' + logItem.id + '] [' + logItem.campaign + '] [' + logItem.group + '] [' + logItem.url + '] [' + logItem.response + '] [' + logItem.action + ']', false);
            RESULTS.push(logItem);

        }

        if (SAVE_RESULTS_TO_SPREADSHEET)
            saveResultsToSpreadsheet(RESULTS);
    }

    var affectedEntries = RESULTS.filter(function (el) {
        return el.action != '-';
    });

    if (SEND_EMAIL && affectedEntries.length > 0) {
        log("Remaining email quota: " + MailApp.getRemainingDailyQuota(), true);
        MailApp.sendEmail({
            to: RECIPIENTS.join(","),
            subject: SUBJECT,
            htmlBody: '<pre>' + JSON.stringify(affectedEntries, null, 2) + '</pre>'
        });
    }


    log('End Execution', true);

}

/**
 * Saves results to the spreadsheet
 * @todo add a check for the spreadsheet size to avoid row limits
 * @param {array} results 
 */
function saveResultsToSpreadsheet(results) {
    var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    var sheet = spreadsheet.getSheetByName(RESULTS_SHEET_NAME);
    sheet.appendRow(['-']);

    for (var i = 0; i < results.length; i++) {
        sheet.appendRow([
            TASK_ID,
            results[i].id,
            results[i].campaign,
            results[i].group,
            results[i].url,
            results[i].response,
            results[i].action
        ]);
    }

}

/**
 * Logs a message to script' logs and to a spreadsheet
 * 
 * @param {string} log A message to log
 * @param {boolean} toSpreadsheet if it will be logged to the spreadsheet too
 */
function log(log, toSpreadsheet) {
    Logger.log(log);

    if (toSpreadsheet) {
        var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
        var sheet = spreadsheet.getSheetByName(LOGS_SHEET_NAME);
        var date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        sheet.appendRow([TASK_ID, date, log]);
    }

}

/**
 * Checks if there is a label and if not, creates it.
 */
function checkLabel() {
    var labelIterator = AdsApp.labels().withCondition("Name CONTAINS '" + LABEL_TO_APPLY + "'").get();
    if (labelIterator.hasNext()) {
        log("Label '" + LABEL_TO_APPLY + "' exists", false);
    } else {
        AdsApp.createLabel(LABEL_TO_APPLY);
        log("Label '" + LABEL_TO_APPLY + "' has been created", true);
    }
}

/**
 * Performs a http request
 * @param {string} url The target url
 * @returns {number} The response code
 */
function requestUrl(url) {
    var responseCode;
    var sleepTime = SLEEP_TIME_FOR_RETRY;
    var numTries = 0;

    while (numTries < NUM_OF_TRIES && !responseCode) {
        try {
            var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: FOLLOW_REDIRECTS });
            responseCode = response.getResponseCode();

        } catch (e) {
            if (e.message.indexOf('Service invoked too many times in a short time:') != -1) {
                log('Request Flooding. Retry in ' + sleepTime, true);
                Utilities.sleep(sleepTime);
                sleepTime *= 2;
            } else if (e.message.indexOf('Service invoked too many times:') != -1) {
                log('Daily quota reached', true);
                throw "Reached UrlFetchApp daily quota";
            } else {
                log(e.message, true);
                return e.message;
            }
        }

        numTries++;
    }

    if (!responseCode) {
        var message = "Reached UrlFetchApp QPS limit";
        log(message, true);
        throw message;
    } else {
        return responseCode;
    }
}

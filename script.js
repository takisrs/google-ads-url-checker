//URL CHECKING
var BAD_RESPONSE_CODES = [404, 301];
var NUM_OF_TRIES = 4;
var SLEEP_TIME_FOR_RETRY = 250;
var FOLLOW_REDIRECTS = false;

//SPREADSHEET
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1nSZ00U-S9YOnxjqZKOSTrPIIBu3esxcLcdIfe1EXWwE/edit?usp=sharing';
var SAVE_RESULTS_TO_SPREADSHEET = true;
var RESULTS_SHEET_NAME = 'results';
var LOGS_SHEET_NAME = 'logs';

//EMAIL
var SEND_EMAIL = true;
var RECIPIENTS = ['panos@atnet.gr'];
var SUBJECT = "Google Ads // Ekdromi // Paused ads";

//RUNTIME VARS
var DRY_RUN = true;
var TASK_ID = '#EK-' + new Date().toISOString().slice(0, 19).replace('T', ' ');
var RESULTS = [];


function main() {
    log('Start Execution', true);

    var AdsIterator = AdWordsApp.ads()
        .withCondition("CreativeFinalUrls CONTAINS '/frontend/deals/view/'") //get only deal urls
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

                if (!DRY_RUN)
                    Ad.pause();
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

    if (SEND_EMAIL) {
        log("Remaining email quota: " + MailApp.getRemainingDailyQuota(), true);
        MailApp.sendEmail({
            to: RECIPIENTS.join(","),
            subject: SUBJECT,
            htmlBody: '<pre>' + JSON.stringify(affectedEntries, null, 2) + '</pre>'
        });
    }


    log('End Execution', true);

}


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

function log(log, toSpreadsheet) {
    Logger.log(log);

    if (toSpreadsheet) {
        var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
        var sheet = spreadsheet.getSheetByName(LOGS_SHEET_NAME);
        var date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        sheet.appendRow([TASK_ID, date, log]);
    }

}


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
'use strict';

var AWS = require('aws-sdk');
var sqs = new AWS.SQS();

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
        },
    };
}

function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
}

function parseLocalDate(date) {
    /**
     * Construct a date object in the local timezone by parsing the input date string, assuming a YYYY-MM-DD format.
     * Note that the Date(dateString) constructor is explicitly avoided as it may implicitly assume a UTC timezone.
     */
    const dateComponents = date.split(/\-/);
    return new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2], "23");
}

function isValidDate(date) {
    try {
        return !(isNaN(parseLocalDate(date).getTime()));
    } catch (err) {
        return false;
    }
}

function buildValidationResult(isValid, violatedSlot, messageContent) {
    if (messageContent == null) {
        return {
            isValid,
            violatedSlot,
        };
    }
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent },
    };
}

function validateRestaurantSuggest(location, cuisine, peopleNum, date, time, phone) {

    if (date) {
        if (!isValidDate(date)) {
            return buildValidationResult(false, 'Date', 'I did not understand that. What date would you like to have a dinner?');
        }
        if (parseLocalDate(date) < new Date()) {
            return buildValidationResult(false, 'Date', 'You can pickup from today onwards. What date would you like to have a dinner??');
        }
    }

    if (time) {
        if (time.length !== 5) {
            // Not a valid time; use a prompt defined on the build-time model.
            return buildValidationResult(false, 'Time', null);
        }
        const hour = parseInt(time.substring(0, 2), 10);
        const minute = parseInt(time.substring(3), 10);
        if (isNaN(hour) || isNaN(minute)) {
            // Not a valid time; use a prompt defined on the build-time model.
            return buildValidationResult(false, 'Time', null);
        }
    }
    return buildValidationResult(true, null, null);
}

function sendMessage(message) {
    var params = {
        QueueName: 'RestaurantQueue', /* required */
    };
    sqs.getQueueUrl(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            console.log(data); // successful response
            console.log(data.QueueUrl);

            var params = {
              MessageBody: JSON.stringify(message), /* required */
              QueueUrl: data.QueueUrl, /* required */
              DelaySeconds: 0,
            };
            sqs.sendMessage(params, function(err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              else     console.log(data);           // successful response
            });
        }
    });
}

function restaurantSuggest(intentRequest, callback) {
    const location = intentRequest.currentIntent.slots.Location;
    const cuisine = intentRequest.currentIntent.slots.Cuisine;
    const peopleNum = intentRequest.currentIntent.slots.PeopleNum;
    const date = intentRequest.currentIntent.slots.Date;
    const time = intentRequest.currentIntent.slots.Time;
    const phone = intentRequest.currentIntent.slots.Phone;

    const source = intentRequest.invocationSource;

    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots.  Use the elicitSlot dialog action to re-prompt for the first violation detected.
        const slots = intentRequest.currentIntent.slots;
        const validationResult = validateRestaurantSuggest(location, cuisine, peopleNum, date, time, phone);
        if (!validationResult.isValid) {
            slots[`${validationResult.violatedSlot}`] = null;
            callback(null, elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
            return;
        }

        // Pass back through session attributes to be used in various prompts defined on the bot model.
        const outputSessionAttributes = intentRequest.sessionAttributes || {};
        callback(null, delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
        return;
    }

    // Restaurant suggestion, and rely on the goodbye message of the bot to define the message to the end user.  In a real bot, this would likely involve a call to a backend service.
    sendMessage(intentRequest.currentIntent.slots)
    callback(null, close(intentRequest.sessionAttributes, "Fulfilled",
    { contentType: "PlainText", content: "You’re all set. Expect my recommendations shortly! Have a good day." }));
}

exports.handler = (event, context, callback) => {
    var intentName = event.currentIntent.name;
    var sessionAttributes = event.sessionAttributes;

    if (intentName === "GreetingIntent") {
        callback(null, close(sessionAttributes, "Fulfilled", 
                            {contentType: "PlainText", content: "Hi there, how can I help?"}));   
    } else if (intentName === "ThankYouIntent") {
        callback(null, close(sessionAttributes, "Fulfilled", 
                             {contentType: "PlainText", content: "You’re welcome."}));
    } else if (intentName === "DiningSuggestionsIntent") {
        return restaurantSuggest(event, callback);
    } else {
        callback(null, 'Invalid Bot Name');
    }
};
'use strict';

var AWS = require('aws-sdk');
var sqs = new AWS.SQS();
var dynamo = new AWS.DynamoDB();

var https = require("https");
var elasticsearch = require('elasticsearch');

function sendEmailMessage(text, email, callback) {
    // Create sendEmail params 
    var params = {
        Destination: { /* required */
            ToAddresses: [
                email,
                /* more items */
            ]
        },
        Message: { /* required */
            Body: { /* required */
                Text: {
                    Charset: "UTF-8",
                    Data: text
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Restaurant Suggestions'
            }
        },
        Source: 'qs479@nyu.edu', /* required */
    };

    // Create the promise and SES service object
    var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

    // Handle promise's fulfilled/rejected states
    sendPromise.then(function (data) {
        console.log(data.MessageId);
    }).catch(function (err) {
        console.error(err, err.stack);
    });
}

function formatText(cuisine, peopleNum, date, time, recommendList) {
    var text = "Hello! Here are my " + cuisine + " restaurant suggestions for " + 
               peopleNum + ", for " + date + " " + time + ": ";
    let idx = 1;
    for (let i = 0; i < recommendList.length; ++i) {
        if (recommendList[i].name && recommendList[i].address) {
            text += (idx++) + ". " + recommendList[i].name + ", located at " + recommendList[i].address; 
            text += i == recommendList.length-1 ? ". Enjoy your meal!" : ", ";  
        }
    }
    return text;
}

function queryRecommendList(cuisine, callback)
{
    let client = new elasticsearch.Client({
        host: 'search-restaurants-search-yibpwuabxlkxekhhf5ncrminom.us-east-1.es.amazonaws.com', // <***required***>
        log: 'trace'
    });
    return client.search({
        index: 'predictions',
        type: 'Prediction',
        body: {
            query: {
              match: {
                  Cuisine: cuisine
              }
            }
        }
    }).then(function (body) {
        let hits = body.hits.hits;
        console.log(hits);
        let recommendIdList = [];
        for (let i = 0; i < hits.length && i < 5; ++i) {
            recommendIdList.push(hits[i]._source.RestaurantID);
        }
        // console.log(recommendIdList);
        return recommendIdList;
    }, function (error) {
        console.trace(error.message);
    });
};

function queryDetails(restaurantId) 
{
    var params = {
        TableName : 'yelp-restaurants',
        KeyConditionExpression: "RestaurantId = :id",
        ExpressionAttributeValues: {
            ":id": {S: restaurantId}
        }
    };
    return new Promise((resolve, reject) => {
        dynamo.query(params, function(err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject("Unable to query");
            } else {
                console.log("Query succeeded.");
                // console.log(data);
                let result = {};
                data.Items.forEach(function(item) {
                    result.name = item.Name.S;
                    result.address = item.Address.S;
                    // console.log(result);
                });
                resolve(result);
            }
        })
    });
}

function getSuggestionList(message, callback) 
{
    // message organization: 
    // { "Cuisine":"Japanese",
    //   "Phone":"1234567890",
    //   "Time":"19:00",
    //   "PeopleNum":"Two people",
    //   "Date":"2018-04-01",
    //   "Location":"Manhattan" }
    // console.log(message);
    
    var email = message.Email;
    queryRecommendList(message.Cuisine, callback)
    .then(data => {
        console.log(data);
        Promise.all(data.map(id => {
            return queryDetails(id);
        }))
        .then(responseData => {
           console.log(responseData);
           let text = formatText(message.Cuisine, message.PeopleNum, message.Date, message.Time, responseData);
            console.log(text);
            sendEmailMessage(text, email, callback);
        });
    });
}

function receiveMessage(callback) {
    var params = {
        QueueName: 'RestaurantQueue', // <***required***>
    };
    sqs.getQueueUrl(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(null, "receiveMessage::Failed to getQueueUrl");
        } else {
            console.log(data); // successful response
            var params = {
              QueueUrl: data.QueueUrl, /* required */
              MaxNumberOfMessages: 1,
              VisibilityTimeout: 0,
              WaitTimeSeconds: 0
            };
            sqs.receiveMessage(params, function(err, data) {
                if (err) {
                      console.log(err, err.stack); // an error occurred
                      callback(null, "receiveMessage::Failed to receive message");
                } else {
                    if (data.Messages && data.Messages.length > 0) {
                        console.log(((data.Messages)[0]).Body); // successful response
                        getSuggestionList(JSON.parse(((data.Messages)[0]).Body), callback);
                    } else {
                        callback(null, "receiveMessage::no message in SQS queue");
                    }
                }
            });
        }
    });
}

exports.handler = (event, context, callback) => {
    receiveMessage(callback);
};

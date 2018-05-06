var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var dynamo = new AWS.DynamoDB();
var async = require('async');

function readDataFromS3(callback) {
    let params = {
        Bucket: 'assignmentfrontend', // bucket name,
        Key: 'assignment3_data/restaurants_22.csv'
    }
    const s3Stream = s3.getObject(params).createReadStream();
    let line = 0;
    let responseData = [];
    return new Promise((resolve, reject) => {
        require('fast-csv').fromStream(s3Stream)
            .on('data', (data) => {
                if (line == 0) line++; // header
                else {
                    // console.log(data);
                    let item = {Timestamp: { N: "" + new Date().getTime() }};
                    if (data[0] !== '') item.RestaurantId = { S: ""+data[0] };
                    if (data[1] !== '') item.Cuisine = { S: ""+data[1] };
                    if (data[2] !== '') item.Rating = { N: ""+data[2] };
                    if (data[3] !== '') item.ReviewCount = { N: ""+data[3] };
                    if (data[4] !== '') item.Name = { S: ""+data[4] };
                    if (data[5] !== '') item.Address = { S: ""+data[5] };
                    if (data[6] !== '') item.Latitude = { S: ""+data[6] };
                    if (data[7] !== '') item.Longitude = { S: ""+data[7] };
                    if (data[8] !== '') item.Zipcode = { S: ""+data[8] };
            
                    responseData.push({
                        PutRequest: {
                            Item: item
                        }
                    });
                }
            })
            .on("end", function () {
                console.log("Done");
                console.log(responseData.length);
                resolve(responseData);
            });
    });
}

exports.handler = function (event, context, callback) {
    // let data = {
    //     id: "nI1UYDCYUTt23TpGxqnLKg",
    //     cuisine: "Chinese",
    //     rating: 4, 
    //     review_count: 3376+"",
    //     name: "Buddakan",
    //     address: "75 9th Ave",
    //     latitude: 40.7422762672197,
    //     longitud: -74.0048000961542,
    //     zipcode: 10011+""
    // };
    readDataFromS3(callback).then((responseData) => {
        let split_arrays = [];
        let size = 25;
        while (responseData.length > 0) {
            split_arrays.push(responseData.splice(0, size));
        }
        let data_imported = false;
        let chunk_no = 1;
        // console.log(split_arrays);
        async.each(split_arrays, function (item_data) {
            dynamo.batchWriteItem({
                RequestItems: {
                    'yelp-restaurants': item_data
                }
            }, function (err, res, cap) {
                console.log('done going next');
                if (err == null) {
                    console.log('Success chunk #' + chunk_no);
                    data_imported = true;
                } else {
                    console.log(err);
                    console.log(res);
                    console.log('Fail chunk #' + chunk_no);
                    data_imported = false;
                }
                chunk_no++;
            });
        }, function () {
            // run after loops
            console.log('all data imported....');
        });
    });
};

const fs = require('fs');
const readline = require('readline');
const shuffle = require('shuffle-array');

let read_file_name = 'data/restaurants.csv';
let train_file = 'data/train.csv';
let test_file = 'data/test.csv';

let pos_num = 100;
let neg_num = 100;

getDataFromExcel(read_file_name)
.then(data => {
    return getTrainTestData(data, pos_num, neg_num);
})
.then(data => {
    // console.log(data);
    let train_data = data.train_data;
    let train_fields = ['id', 'cuisine', 'rating', 'review_count', 'recommended'];
    insertToExcel(train_file, train_fields, train_data);

    let test_data = data.test_data;
    let test_fields = ['id', 'cuisine', 'rating', 'review_count'];
    insertToExcel(test_file, test_fields, test_data);
})
.catch(err => {
    console.log("Error saving train/test excel data, error=", err);
});

function insertToExcel(write_file_name, fields, data) {
    let Json2csvParser = require('json2csv').Parser;
    let json2csvParser = new Json2csvParser({ fields });
    const csv = json2csvParser.parse(data);
    // console.log(csv);
    fs.appendFile(write_file_name, csv, (err) => {
        if (err) {
            console.log("Error when inserting to excel=", write_file_name, ", error=", err);
        }
    });
}

function getTrainTestData(data, pos_num, neg_num)
{
    let train_data = [];
    let test_data = [];
    let pos_count = 0;
    let neg_count = 0;
    let collection = Array.from(Array(data.length).keys());

    shuffle(collection);
    for (let i = 0; i < collection.length; ++i) {
        let line = data[collection[i]];
        if (pos_count < pos_num && line.rating > 4.0 && line.review_count > 200) {
            train_data.push({
                id: line.id,
                cuisine: line.cuisine,
                rating: line.rating,
                review_count: line.review_count,
                recommended : 1
            });
            pos_count++;
        } else if (neg_count < neg_num && line.rating <= 3.5 && line.review_count > 300) {
            train_data.push({
                id: line.id,
                cuisine: line.cuisine,
                rating: line.rating,
                review_count: line.review_count,
                recommended : 0
            });
            neg_count++;
        } else {
            test_data.push({
                id: line.id,
                cuisine: line.cuisine,
                rating: line.rating,
                review_count: line.review_count,
            });
        }
    }
    return {
        train_data : train_data,
        test_data : test_data
    };
}

function getDataFromExcel(read_file_name) {
    return new Promise((resolve, reject) => {
        let rd = readline.createInterface({
            input: fs.createReadStream(read_file_name),
        });
        let restaurant_list = [];
        let count = 0;
        rd.on('line', function (line) {
            if (count === 0) {
                count++;
            } else {
                // console.log(line);
                let data = line.split(",");
                restaurant_list.push({
                    id: data[0],
                    cuisine: data[1],
                    rating: parseFloat(data[2]),
                    review_count: parseInt(data[3],10),
                });
                count++;
            }
        }).on('close', function () {
            resolve(restaurant_list);
        });
    });
}

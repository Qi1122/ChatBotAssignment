const fs = require('fs');
const readline = require('readline');

const read_file_name = 'data/restaurants_22.json';
const write_file_name = 'data/restaurants_22.csv';

getData(read_file_name)
.then(data => {
    // console.log(data);
    insertToExcel(write_file_name, data);
})
.catch(err => {
    console.log("Error converting from json to excel, error=", err);
});

function getData(read_file_name) 
{
    return new Promise((resolve, reject) => {
        let rd = readline.createInterface({
            input: fs.createReadStream(read_file_name),
        });
        let restaurant_list = [];
        let map = {};
        rd.on('line', function (line) {
            let data = JSON.parse(line);
            for (let i = 0; i < data.businesses.length; ++i) {
                let res = data.businesses[i];
                if (!map[res.id]) {
                    if (restaurant_list.length >= 5000) {
                        break;
                    }
                    restaurant_list.push({
                        id: res.id,
                        cuisine: res.cuisine,
                        rating: res.rating,
                        review_count: res.review_count,
                        name: res.name,
                        address: res.address,
                        latitude: res.coordinates.latitude,
                        longitude: res.coordinates.longitude,
                        zipcode: res.zip_code,
                    });
                }
            }
        }).on('close', function() {
            resolve(restaurant_list);
        });
    });
}

function insertToExcel(write_file_name, data) 
{   
    let Json2csvParser = require('json2csv').Parser;

    let fields = ['id', 'cuisine', 'rating', 'review_count','name',
        'address', 'latitude', 'longitude', 'zipcode'];
    let json2csvParser = new Json2csvParser({ fields });
    const csv = json2csvParser.parse(data);
    // console.log(csv);
    fs.appendFile(write_file_name, csv, (err) => {
        if (err) {
            console.log("Error when inserting to excel=", write_file_name, ", error=", err);
        }
    });
}

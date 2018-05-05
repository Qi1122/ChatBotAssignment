'use strict';

const yelp = require('yelp-fusion');
const fs = require('fs');
const apiKey = "mZI2FV1qi6ZwC-ccOz-aRWWpkFoQ0RHAxmzrId8141bI67eQp-x6EvBrrmBlo9BNGWygZI4xxTqqCYpw0UhA5HLa9X3cPrHIPTRd5aLB3vjffYKRZ-30jQ_pqZ7BWnYx";

let client = yelp.client(apiKey);
let file_name = "data/restaurants.json";

let limit = 50;
let max_request_num = 5;

// 429 error: too many requests
// https://www.yelp.com/developers/documentation/v3/rate_limiting
let start_offset = 250; // 0, 250, 500, 750
let categories = ["thai,All"];
execute(start_offset, categories);

// let start_offset;
// let categories;
// let categories_list = ["chinese,All", "indpak,All", "japanese,All", 
//     "korean,All", "mexican,All", "newamerican", "italian,All",
//     "thai,All"];
// for (let i = 0; i < categories_list.length; ++i) {
//     for (let j = 0; j < 250; j += 250) {
//         start_offset = j;
//         categories = [categories_list[i]];
//         execute(start_offset, categories);
//     }
// }

function execute(start_offset, categories)
{
    let categoriesMap = {
        "chinese,All" : "Chinese",
        "indpak,All" : "Indian",
        "japanese,All" : "Japanese",
        "korean,All" : "Korean",
        "mexican,All" : "Mexican",
        "newamerican" : "American",
        "italian,All" : "Italian",
        "thai,All" : "Thai"
    };

    let search_dict_arr = init_search_params(categories, limit, max_request_num, start_offset);

    loadData(client, search_dict_arr, categoriesMap)
    .then(data => {
        saveToJson(fs, file_name, data);
    })
    .catch(err => {
        console.log("Error loading data, error=", err);
    });
}

// --- utility functions --- 
function init_search_params(categories, limit, max_request_num, start_offset)
{
    let search_dict_arr = [];
    for (let i = 0; i < categories.length; ++i) {
        for (let j = 0; j < max_request_num; ++j) {
            let offset = start_offset + j * limit;
            let search_dict = { 
                location : "Manhattan", 
                categories: categories[i],
                limit: limit,
                offset: offset
            };
            search_dict_arr.push(search_dict);
        }
    }
    return search_dict_arr;
}

function loadShotData(client, search_dict, categoriesMap)
{
    return client.search(search_dict)
    .then(response => {
        // console.log(response.jsonBody.businesses);
        let data = [];
        let businesses = response.jsonBody.businesses;
        if (businesses) {
            for (let i = 0; i < businesses.length; ++i) {
                let business = businesses[i];
                data.push({
                    id: business.id,
                    name: business.name,
                    cuisine: categoriesMap[search_dict.categories],
                    address: business.location.address1,
                    coordinates: business.coordinates,
                    review_count: business.review_count,
                    rating: business.rating,
                    zip_code: business.location.zip_code
                });
            }
        }
        return data;
    }).catch(e => {
        console.error("Error loading shot data, criteria=", search_dict, ", error=", e);
    });
}

function loadData(client, search_dict_arr, categoriesMap)
{
    let data = {
        businesses : []
    };
    return Promise.all(search_dict_arr.map((search_dict) => {
        return loadShotData(client, search_dict, categoriesMap);
    }))
    .then(responses => {
        // console.log("responses", responses);
        responses.map(response => {
            for (let i = 0; i < response.length; ++i) {
                data.businesses.push(response[i]);
            }
        });
        console.log("total row# =", data.businesses.length);
        return data;
    })
    .catch(err => {
        console.log("Error when loading data, error=", err);
    })
}

function saveToJson(fs, file_name, data)
{
    let res = JSON.stringify(data) + "\n";
    // console.log(res);
    fs.appendFile(file_name, res, (err) => {
        if (err) {
            console.log("Error when writing to file=", file_name, "error info=", err);
        }
    });
}

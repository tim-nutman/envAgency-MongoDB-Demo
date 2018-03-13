var MongoClient = require('mongodb').MongoClient
var assert = require('assert')
var request = require('request')
var async = require('async')
var http = require('http')
var MeasuresDAO = require('./measures').MeasuresDAO
var StationsDAO = require('./stations').StationsDAO

var mdbConnectionString = 'mongodb://localhost'

MongoClient.connect(mdbConnectionString, function (err, client) {
  'use strict'
  assert.equal(null, err)

  var db = client.db('envAgency')
  var stations = new StationsDAO(db)

  stations.getAllMeasures(function (measuresArray) {
    var measurementsArray = []
    var requests = []
    console.log(measuresArray.length)
    for (var x = 0; x < measuresArray.length; x++) {
      var url = measuresArray[x].measuresURI
      requests.push(function (callback) {
        http.request(url, function (res) {
          callback(null, res.statusCode)
        }).end()
      })
    }
    async.parallelLimit(requests, 100, function (err, results) {
      assert(err, 'something has gone wrong')
      console.log(JSON.stringify(results))
    })
  })

// Need to read all of the stations/measures into an array - this is the array that will be looped through

// For each measure URL we get hit the Env Agency site to retrieve the measure document

// For each measure we retrieve the latest measure and write to the measures collection

// Process the array of measures (possibly update a config/status document), wait 15 minutes and then run again.
})

/***************************************************/

// Module dependencies.

var app = require('express')()
var express = require('express')
var http = require('http').Server(app)
var io = require('socket.io')(http)
var bodyParser = require('body-parser')
var nunjucks = require('nunjucks')
var MongoClient = require('mongodb').MongoClient
var assert = require('assert')
var request = require('request')
var StationsDAO = require('./stations').StationsDAO
var MeasuresDAO = require('./measures').MeasuresDAO
var ConfigDAO = require('./configs').ConfigDAO
const path = require('path')

/***************************************************/

// Configure the app to use express

app.set('view engine', 'html')
app.set('views', path.join(__dirname, '/views'))
app.use('/static', express.static(path.join(__dirname, '/static')))
app.use(bodyParser.urlencoded({ extended: true }))

/***************************************************/

// Configure nunjucks to work with express

var env = nunjucks.configure('views', {
  autoescape: true,
  express: app
})

var nunjucksDate = require('nunjucks-date')
nunjucksDate.setDefaultFormat('MMMM Do YYYY, h:mm:ss a')
env.addFilter('date', nunjucksDate)

/***************************************************/

// MongoDB Connection Information v3.6 Connection String
// Provide some context switching (command line params?)

// var mdbConnectionString = 'mongodb+srv://tim_nutman:N03ll3_T1m@playground-sfmev.mongodb.net';
// var mdbConnectionString = 'mongodb://localhost'
var mdbConnectionString = 'mongodb://admin:M0ng0DB!@ec2-18-232-198-215.compute-1.amazonaws.com:27000,' +
'ec2-34-235-77-20.compute-1.amazonaws.com:27000,ec2-35-169-75-170.compute-1.amazonaws.com:27000/?replicaSet=SADemoRepSet'
console.log(mdbConnectionString)
/***************************************************/

MongoClient.connect(mdbConnectionString, function (err, client) {
  'use strict'
  assert.equal(null, err)

  var db = client.db('envAgency')
  var stations = new StationsDAO(db)
  var measures = new MeasuresDAO(db)
  var appConfigs = new ConfigDAO(db)

  var getMeasuresTimeoutObj

  var measuresIntervalRun = 0

  app.get('/', function (req, res) {
    stations.countStations(function (count) {
      res.render('index', { totalStations: count })
    })
  })

  app.get('/catchmentNames', function (req, res) {
    stations.getAggregateValues('catchmentName', function (catchmentNamesArray) {
      res.send(catchmentNamesArray)
    })
  })

  app.get('/riverNames', function (req, res) {
    stations.getAggregateValues('riverName', function (riverNamesArray) {
      res.send(riverNamesArray)
    })
  })

  app.get('/riverNamesInCatchmentArea', function (req, res) {
    stations.getAggregateValuesWithMatch('riverName', 'catchmentName', req.query.catchmentName, function (riverNamesArray) {
      res.send(riverNamesArray)
    })
  })

  app.get('/getMonitoringStations', function (req, res) {
    stations.getMonitoringStations(req.query.fieldName, req.query.fieldValue, function (stationsArray) {
      res.send(stationsArray)
    })
  })

  app.get('/getMonitoringStationsGeo', function (req, res) {
    stations.getMonitoringStationsGeo(req.query.fieldName, req.query.fieldValue, function (stationsArray) {
      res.send(stationsArray)
    })
  })

  app.get('/stopMeasuresData', function (req, res) {
    appConfigs.stopCaptureProcessRunning('scheduledMeasures')
    clearInterval(getMeasuresTimeoutObj)
    res.send('Measure Reading Process stopped')
  })

  app.get('/getMeasuresData', function (req, res) {
    // check to see if running
    appConfigs.isCaptureProcessRunning('scheduledMeasures', function (runningState) {
      if (runningState) {
        // scheduled import already running
        res.send('Process currently running')
      } else {
        // need to update the config dock to show running
        appConfigs.startCaptureProcessRunning('scheduledMeasures')
        getMeasuresTimeoutObj = setInterval(function () {
          measuresIntervalRun = measuresIntervalRun + 1
          console.log('tarting to get measures: Run ' + measuresIntervalRun)
          var measuresURL = 'http://environment.data.gov.uk/flood-monitoring/data/readings?latest'
          request(measuresURL, measures, function (error, response, body) {
            assert.equal(null, error)
            var measuresDataResponse = JSON.parse(body)
            console.log('Number of measures read: ' + measuresDataResponse.items.length)
            var measuresDocs = []
            for (var x = 0; x < measuresDataResponse.items.length; x++) {
              measuresDocs[x] = measuresDataResponse.items[x]
              measuresDocs[x]._id = measuresDataResponse.items[x]['@id']
              delete measuresDocs[x]['@id']
              measuresDocs[x].dateTime = new Date(measuresDataResponse.items[x].dateTime)
            }

            measures.addMeasures(measuresDocs, function (numberMeasuresInserted) {
              console.log('Number of measures inserted/updated: ' + numberMeasuresInserted)
            })
          })
        }, 900000)
        console.log('Measures Interval Process Started')
        res.send('Measures Interval Process Started')
      }
    })
  })

  app.get('/updateEnvAgencyStations', function (req, res) {
    var stationDataURL = 'http://environment.data.gov.uk/flood-monitoring/id/stations'

    console.log('Started at ' + new Date())
    console.log('Fetching Data from ' + stationDataURL)

    request(stationDataURL, stations, function (error, response, body) {
      assert.equal(null, error)
      var stationDataResponse = JSON.parse(body)
      console.log('Number of stations: ' + stationDataResponse.items.length)
      var stationsDocs = []
      var x = 0

      for (x = 0; x < stationDataResponse.items.length; x++) {
        stationsDocs[x] = stationDataResponse.items[x]
        stationsDocs[x]._id = stationDataResponse.items[x]['@id']
        delete stationsDocs[x]['@id']

        if (stationsDocs[x].lat !== undefined) {
          stationsDocs[x].geoloc = [stationsDocs[x].long, stationsDocs[x].lat]
        }

        delete stationsDocs[x].long
        delete stationsDocs[x].lat
      }

      // var stationsDocsJSON = JSON.stringify(stationsDocs);

      stations.fullRefreshStations(stationsDocs, function (numNewStations) {
        res.render('stationRefresh', { newStations: numNewStations })
      })
    })
  })

  io.on('connection', function (socket) {
    console.log('A new WebSocket connection has been established')
  })

  setInterval(function () {
    var stockprice = Math.floor(Math.random() * 1000)
    io.emit('stock price update', stockprice)
  }, 2000)

  http.listen(3000, function () {
    console.log('Listening on localhsot:3000')
  })
})

/*
jshint esversion: 6
*/

var assert = require('assert')

function StationsDAO (database) {
  'use strict'

  this.db = database

  // Return the number of stations currently in the collection
  this.countStations = function (callback) {
    var collection = this.db.collection('stations')
    collection.count({}, function (e, count) {
      console.log('Query executed: ' + count)
      callback(count)
    })
  }

  // Perform a full update of the stations in the collection
  this.fullRefreshStations = function (stationsDocs, callback) {
    this.db.dropCollection('stations')
    this.db.collection('stations').insertMany(stationsDocs, {ordered: false}, function (e, obj) {
      if (e) {
        console.log(e)
      } else {
        console.log(obj)
      }
      console.log('Got here, so the function is definitely being call')
      callback(stationsDocs.length)
    })
  }

  // get a list of values for a given key/field name - simple aggregate on one field
  this.getAggregateValues = function (fieldName, callback) {
    var agr = [{$group: {_id: '$' + fieldName}}, {$sort: {_id: 1}}]
    this.db.collection('stations').aggregate(agr).toArray(function (err, res) {
      assert.equal(err, null)
      callback(res)
    })
  }

  // get a list of values for a given key based on a given match field name (expression?)
  this.getAggregateValuesWithMatch = function (resultFieldName, matchFieldName, matchFieldValue, callback) {
    var agr = [{$match: {[matchFieldName]: matchFieldValue}}, {$group: {_id: '$' + resultFieldName}}, {$sort: {_id: 1}}]
    this.db.collection('stations').aggregate(agr).toArray(function (err, res) {
      assert.equal(err, null)
      callback(res)
    })
  }

  // get a list of monitoring stations based on a catchmentName or RiverName
  this.getMonitoringStations = function (matchFieldName, matchFieldValue, callback) {
    var filter = {[matchFieldName]: matchFieldValue}
    console.log(filter)
    this.db.collection('stations').find(filter).toArray(function (err, res) {
      assert.equal(err, null)
      callback(res)
    })
  }

  // get a list of monitoring stations Geo Location data based on a catchmentName or RiverName
  this.getMonitoringStationsGeo = function (matchFieldName, matchFieldValue, callback) {
    var filter = {[matchFieldName]: matchFieldValue}
    var projection = { _id: 0, geoloc: 1, label: 1 }
    console.log(filter)
    this.db.collection('stations').find(filter).project(projection).toArray(function (err, res) {
      assert.equal(err, null)
      callback(res)
    })
  }

  // get a list of all measures in the stations collection
  this.getAllMeasures = function (callback) {
    var pipeline = [{$unwind: '$measures'}, {$project: {_id: 0, 'measuresURI': '$measures.@id'}}]
    // var projection = {_id: 0, 'measuresURI': '$measures.@id'}
    this.db.collection('stations').aggregate(pipeline).toArray(function (err, res) {
      assert.equal(err, null)
      callback(res)
    })
  }
}

module.exports.StationsDAO = StationsDAO

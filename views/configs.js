/*
jshint esversion: 6
*/

// var MongoClient = require('mongodb').MongoClient
var assert = require('assert')

function ConfigDAO (database) {
  'use strict'
  this.db = database
  // read measures into MongoDB (this should really be a standalone application that is running in the background)

  this.isCaptureProcessRunning = function (configName, callback) {
    var filter = {configName: configName}
    this.db.collection('appConfig').find(filter).toArray(function (err, res) {
      assert.equal(err, null)
      callback(res[0].isRunning)
    })
  }

  this.startCaptureProcessRunning = function (configName, callback) {
    var filter = {configName: configName}
    var updateDoc = {$set: {isRunning: true}}
    this.db.collection('appConfig').updateOne(filter, updateDoc, function (err, res) {
      assert.equal(err, null)
      console.log(configName + ' config doc updated to ' + updateDoc)
    })
  }

  this.stopCaptureProcessRunning = function (configName, callback) {
    var filter = {configName: configName}
    var updateDoc = {$set: {isRunning: false}}
    this.db.collection('appConfig').updateOne(filter, updateDoc, function (err, res) {
      assert.equal(err, null)
      console.log(configName + ' config doc updated to ' + updateDoc)
    })
  }
}
module.exports.ConfigDAO = ConfigDAO

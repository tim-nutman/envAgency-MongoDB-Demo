/*
jshint esversion: 6
*/

// var MongoClient = require('mongodb').MongoClient
// var assert = require('assert')

function MeasuresDAO (database) {
  'use strict'
  this.db = database
  // read measures into MongoDB (this should really be a standalone application that is running in the background)

  this.addMeasures = function (measuresDocs, callback) {
    this.db.collection('measures').insertMany(measuresDocs, {ordered: false}, function (e, obj) {
      if (e) {
        // console.log(e)
      } else {
        // console.log(obj)
      }
      console.log('Got here, so the function is definitely being call')
      callback(measuresDocs.length)
    })
  }
}
module.exports.MeasuresDAO = MeasuresDAO

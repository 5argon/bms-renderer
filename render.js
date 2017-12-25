#!/usr/bin/env node
'use strict'

require('babel-polyfill')

const childProcess = require('child_process')
const getNotes = require('./getNotes')
const _ = require('lodash')
const satisfies = require('semver').satisfies
const Promise = require('bluebird')

// const ogg = require('ogg')
// const vorbis = require('vorbis')

async function makeBuffer(song, start, length) {
  const snd = require('./snd')
  const samples = {}

  function frameForTime(seconds) {
    return Math.floor(seconds * 44100)
  }

  process.stderr.write('Loading samples...\n')

  song.keysounds.forEach(function (samplepath) {
    debug("Reading sample : " + samplepath)
    var sound = samples[samplepath] = snd.read(samplepath)
    if (sound.samplerate !== 44100) {
      throw new Error(samplepath + ' must be 44100 hz')
    }
    if (sound.channels !== 2) {
      throw new Error(samplepath + ' must be 2 channels')
    }
    process.stderr.write('.')
  })

  process.stderr.write('\n')

  var validNotes = _(song.data).map(function (note) {
    return _.assign({ sound: samples[note.src] }, note)
  }).filter('sound').value()
  process.stderr.write('Number of valid notes: ' + validNotes.length + '\n')

  const shiftStartFrame = frameForTime(start);
  const lengthFrame = frameForTime(length);

  var endSongFrame = _(validNotes).map(function (note) {
    var length = note.sound.frames
    return frameForTime(note.time) + length
  }).max()

  var skip = _(validNotes).map(function (note) {
    return frameForTime(note.time)
  }).min()

  const startFrame = Math.min(skip + shiftStartFrame, endSongFrame);
  const endFrame = length == 0 ? endSongFrame : Math.min(startFrame + lengthFrame, endSongFrame);

  //console.log(startFrame + " " + endFrame + " " + shiftStartFrame + " " + lengthFrame + " " + endSongFrame + " " + skip)

  const frames = endFrame - startFrame;

  process.stderr.write('Total song length: ' + (frames / 44100) + '\n')

  process.stderr.write('Writing notes...' + '\n')
  debug("Writing samples...")
  var buffer = new Buffer(frames * 2 * 4)
  _.each(validNotes, function (note) {
    var sound = note.sound
    var start = frameForTime(note.time) - skip
    var cut = note.cutTime && (frameForTime(note.cutTime) - skip)
    var offset = start * 2 * 4

    var framesToCopy = sound.frames
    if (cut > 0) {
      framesToCopy = Math.min(framesToCopy, cut - start)
    }

    var soundBuffer = sound.buffer
    const soundBufferBeginReading = Math.max(0, startFrame - skip - start) * 2 * 4
    const length = Math.min(soundBuffer.length - soundBufferBeginReading, framesToCopy * 2 * 4)

    for (var i = soundBufferBeginReading; i < (soundBufferBeginReading + length); i += 4) {
      const position = (offset + i) - ((shiftStartFrame) * 2 * 4)

      if (position > buffer.length - 4) {
        break;
      }

      const floatFile = buffer.readFloatLE(position)
      const floatSound = soundBuffer.readFloatLE(i)
      buffer.writeFloatLE(Math.max(Math.min(floatFile + floatSound, 1), -1), position)
    }
    process.stderr.write('.')
  })
  process.stderr.write('\n')
  process.stderr.write('Writing output!\n')

  return buffer;

}

async function render(filePath, start, length)
{
    var song = await getNotes(filePath)
    console.log(JSON.stringify(song.info, null, 2))
    try
    {
      var songBuffer = await makeBuffer(song, start, length) //promise
    }
    catch(e){
      console.error(e)
    }
    debug("Rendering done.")
    //debug(songBuffer)

    // let oggE = new ogg.Encoder()
    // let vorbisE = new vorbis.Encoder()
    // vorbisE.pipe(oggE.stream())
    // oggE.pipe(fs.createWriteStream("./out.ogg"))
    // vorbisE.write(Buffer.from(songBuffer), (err) => {vorbisE.end()})

    return songBuffer
}

function debug(message)
{
  //console.log(message)
  postMessage(["progress",message])
}

// for development purpose
{
  //render("tana/vista_A.bms", 2,3)
  //render("dys/_dystopiahigh[ANOTHER].bms", 16,8)
}

module.exports.render = render;

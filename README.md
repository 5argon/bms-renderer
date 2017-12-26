bms-renderer
============

Like [BMX2WAV], but written in JavaScript, works on a Mac, and outputs 32-bit floating point WAV files.

[BMX2WAV]: http://childs.squares.net/program/bmx2wav/


## Fork

This fork + this branch does not output an audio file but instead returns a PCM float Buffer. You can then render it to any format manually.

```
npm install git+https://github.com/5argon/bms-renderer.git#bms-preview-maker
```

```javascript
const bmsRenderer = require('bms-renderer')
let buffer = await bmsRenderer.render("path/file.bms",5,3) //path, start measure, length measure
//Use the buffer
```

If you run this as a `WebWorker` there is a `postMessage` that continuously reports the progress with this format `["progress", progressMessage]`

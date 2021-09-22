/* UI thread code */

var pixelsToDraw = [],
  workers = [];

var createWorker = function (canvasWidth, canvasHeight) {
  var worker = new Worker('path/to/worker.js');

  worker.onmessage = function (message) {
    for (var i = 0; i < message.data.length; i++) pixelsToDraw.push(message.data[i]);
  };

  worker.postMessage({
    canvasWidth: canvasWidth,
    canvasHeight: canvasHeight
  });

  return worker;
};

var startWorkers = function (options) {
  var canvasWidth = options.canvasWidth,
    canvasHeight = options.canvasHeight,
    numberOfWorkers = options.numberOfWorkers;

  for (var i = 0; i < numberOfWorkers; i++) workers.push(createWorker(canvasWidth, canvasHeight));
};

var terminateWorkers = function () {
  for (var i = 0; i < workers.length; i++) workers.pop().terminate();
};


/* entry points */

document.getElementById('startButton').addEventListener('click', startWorkers);

document.getElementById('stopButton').addEventListener('click', terminateWorkers);

/* Worker code */

var getRandomWholeNumberLessThan = function (max) {
    return Math.floor(Math.random() * max);
  };
  
  onmessage = function (message) {
    var canvasWidth = message.data.canvasWidth,
      canvasHeight = message.data.canvasHeight;
  
    // keep generating new pixels until the worker is terminated
    while (true) {
      var x = getRandomWholeNumberLessThan(canvasWidth),
        y = getRandomWholeNumberLessThan(canvasHeight),
        r = getRandomWholeNumberLessThan(256),
        g = getRandomWholeNumberLessThan(256),
        b = getRandomWholeNumberLessThan(256),
        a = getRandomWholeNumberLessThan(256);
    
      postMessage({
        x: x,
        y: y,
        r: r,
        g: g,
        b: b,
        a: a
      });
    }
  };
  
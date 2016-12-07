
(function ($, cornerstone, cornerstoneWADOImageLoader) {

  "use strict";

  var canvas = document.createElement('canvas');
  var lastImageIdDrawn = '';

  function makeColorImage(image, storedPixelData) {

    var imageDataPromise, deferred = $.Deferred();
    var rows = image.instance.rows;
    var columns = image.instance.rows;

    image.render = cornerstone.renderColorImage;
    image.minPixelValue = 0;
    image.maxPixelValue = 255;
    image.invert = false;

    lastImageIdDrawn = void 0;

    try {

      imageDataPromise = cornerstoneWADOImageLoader.convertColorSpace(canvas, null, storedPixelData, image.instance);
      imageDataPromise.then(function (imageData) {

        function getPixelData() {
            return imageData.data;
        }

        function getImageData() {
            return imageData;
        }

        function getCanvas() {
            if(lastImageIdDrawn === image.imageId) {
                return canvas;
            }

            canvas.height = rows;
            canvas.width = columns;
            var context = canvas.getContext('2d');
            context.putImageData(imageData, 0, 0 );
            lastImageIdDrawn = image.imageId;
            return canvas;
        }

        image.getPixelData = getPixelData;
        image.getImageData = getImageData;
        image.getCanvas = getCanvas;
        image.rows = rows;
        image.columns = columns;
        image.height = rows;
        image.width = columns;

        if(image.windowCenter === undefined || isNaN(image.windowCenter) ||
            image.windowWidth === undefined || isNaN(image.windowWidth)) {
          image.windowWidth = 255;
          image.windowCenter = 128;
        }

        deferred.resolve(image);
      }, function (error) {
        deferred.reject(error);
      });

    } catch(error) {
      deferred.reject(err);
    }

    return deferred.promise();

  }

  function makeGrayscaleImage(image, storedPixelData) {
    var deferred = $.Deferred();
    var minMax = cornerstoneWADOImageLoader.getMinMax(storedPixelData);
    image.minPixelValue = minMax.min;
    image.maxPixelValue = minMax.max;
    image.render = cornerstone.renderGrayscaleImage;
    image.invert = (image.instance.photometricInterpretation === 'MONOCHROME1');
    image.getPixelData = function() {
      return storedPixelData;
    };
    deferred.resolve(image);
    return deferred.promise();
  }

  function loadImage(imageId) {
    var deferred = $.Deferred();
    var index = imageId.substring(7);
    var image = cornerstoneWADOImageLoader.imageManager.get(index);
    if(image === undefined) {
      deferred.reject('unknown imageId');
      return deferred.promise();
    }

    var mediaType;// = 'image/dicom+jp2';

    cornerstoneWADOImageLoader.internal.getImageFrame(image.uri, mediaType).then(function(result) {
      //console.log(result);
      // TODO: add support for retrieving compressed pixel data
      var imagePromise, storedPixelData;
      if(image.instance.bitsAllocated === 16) {
        // if the address is not word-aligned a new buffer needs to be created
        // in order to comply with underlying hardware constraints.
        // https://en.wikipedia.org/wiki/Data_structure_alignment
        if ((result.offset & 1) !== 0) {
          var unalignedResult = result;
          var unalignedBuffer = new Uint8Array(unalignedResult.arrayBuffer, unalignedResult.offset, unalignedResult.length);
          var alignedBuffer = new Uint8Array(unalignedBuffer);
          result = $.extend({}, unalignedResult);
          result.offset = 0;
          result.length = unalignedResult.length;
          result.arrayBuffer = alignedBuffer.buffer;
        }
        if(image.instance.pixelRepresentation === 0) {
          storedPixelData = new Uint16Array(result.arrayBuffer, result.offset, result.length / 2);
        } else {
          storedPixelData = new Int16Array(result.arrayBuffer, result.offset, result.length / 2);
        }
      } else if(image.instance.bitsAllocated === 8) {
        storedPixelData = new Uint8Array(result.arrayBuffer, result.offset, result.length);
      }

      // Set image id...
      image.imageId = imageId;

      // TODO: handle various color space conversions
      if (cornerstoneWADOImageLoader.isColorImage(image.instance.photometricInterpretation)) {
        imagePromise = makeColorImage(image, storedPixelData);
      } else {
        imagePromise = makeGrayscaleImage(image, storedPixelData);
      }

      imagePromise.then(function (image) {
        deferred.resolve(image);
      }, function (error) {
        deferred.reject(error);
      });

    }).fail(function(reason) {
      deferred.reject(reason);
    });

    return deferred.promise();
  }

  // registery dicomweb and wadouri image loader prefixes
  cornerstone.registerImageLoader('wadors', loadImage);

}($, cornerstone, cornerstoneWADOImageLoader));
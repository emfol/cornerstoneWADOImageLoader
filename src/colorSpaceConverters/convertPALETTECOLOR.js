(function (cornerstoneWADOImageLoader) {

  "use strict";

  function convertPALETTECOLOR( imageFrame, rgbaBuffer, dataSet, metadata ) {

    var len, start, bits, numPixels;
    var buffer, rData, gData, bData;

    if (dataSet === null && metadata !== void 0) {
      len = metadata.redPaletteColorLookupTableDescriptor[0];
      start = metadata.redPaletteColorLookupTableDescriptor[1];
      bits = metadata.redPaletteColorLookupTableDescriptor[2];
      numPixels = metadata.rows * metadata.columns;
      rData = new Uint16Array( metadata.redPaletteColorLookupTable.buffer );
      gData = new Uint16Array( metadata.greenPaletteColorLookupTable.buffer );
      bData = new Uint16Array( metadata.bluePaletteColorLookupTable.buffer );
    } else {
      len = dataSet.int16('x00281101', 0);
      start = dataSet.int16('x00281101', 1);
      bits = dataSet.int16('x00281101', 2);
      numPixels = dataSet.uint16('x00280010') * dataSet.uint16('x00280011');
      buffer = dataSet.byteArray.buffer;
      rData = new Uint16Array( buffer, dataSet.elements.x00281201.dataOffset, len );
      gData = new Uint16Array( buffer, dataSet.elements.x00281202.dataOffset, len );
      bData = new Uint16Array( buffer, dataSet.elements.x00281203.dataOffset, len );
    }

    // Account for zero-values for the lookup table length
    //
    // "The first Palette Color Lookup Table Descriptor value is the number of entries in the lookup table.
    //  When the number of table entries is equal to 2^16 then this value shall be 0."
    //
    // See: http://dicom.nema.org/MEDICAL/Dicom/2015c/output/chtml/part03/sect_C.7.6.3.html#sect_C.7.6.3.1.5
    if (!len) {
      len = 65536;
    }

    var shift = (bits===8 ? 0 : 8 );
    var palIndex=0;
    var rgbaIndex=0;

    for( var i=0 ; i < numPixels ; ++i ) {
      var value=imageFrame[palIndex++];
      if( value < start )
        value=0;
      else if( value > start + len -1 )
        value=len-1;
      else
        value=value-start;

      rgbaBuffer[ rgbaIndex++ ] = rData[value] >> shift;
      rgbaBuffer[ rgbaIndex++ ] = gData[value] >> shift;
      rgbaBuffer[ rgbaIndex++ ] = bData[value] >> shift;
      rgbaBuffer[ rgbaIndex++ ] = 255;
    }

  }

  // module exports
  cornerstoneWADOImageLoader.convertPALETTECOLOR = convertPALETTECOLOR;

}(cornerstoneWADOImageLoader));
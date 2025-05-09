import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

export function createArchive(destination: string, filename: string) {

  // create a file to stream archive data to.
  const output = fs.createWriteStream(path.join(destination, `${filename}.zip`));
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Sets the compression level.
  });

  // This event is fired when the data source is drained no matter what was the data source.
  // It is not part of this library but rather from the NodeJS Stream API.
  // @see: https://nodejs.org/api/stream.html#stream_event_end
  output.on('end', function() {
    console.log('Data has been drained');
  });

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      // log warning
    } else {
      // throw error
      throw err;
    }
  });

  // good practice to catch this error explicitly
  archive.on('error', function(err) {
    throw err;
  });

  // pipe archive data to the file
  archive.pipe(output);
  return archive;
}
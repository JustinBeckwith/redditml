const harvester = require('./harvester');
const publisher = require('./publisher');
const subreddits = require('./subreddits').subreddits;
const async = require('async');
const fs = require('fs');

function harvestAll() {
  
  async.series(
    subreddits.map((subreddit) => {
      return (callback) => {
        harvester.getComments(subreddit.name)
          .then((filePath) => {
            callback();
          })
          .catch((err) => {
            callback(err);  
          });
      }
    }),
    (err, results) => {
      if (err) {
        console.error(err);
        return;
      } else {
        console.log(results);
      }
    }
  );

}

function publishAll(dir) {
  fs.readdir(dir, (err, files) => {
    files.forEach(file => {
      let path = `${dir}/${file}`;      
      console.log(`Processing ${path}...`);
      publisher.importData(path);
    });
  })
}

//harvestAll();
publishAll('./data');

const readline = require('readline');
const fs = require('fs');
const async = require('async');
const nconf = require('nconf');
const Translate = require('@google-cloud/translate');

nconf.argv().env().file({
  file: 'translate_key.json'
});

const translate = Translate({ 
  projectId: 'redditml',
  key: nconf.get('translate_api_key')
});

let readDir = process.argv[2]; //'./data';
let writeDir = process.argv[3]; //'./data/sentiment';

analyzeAll();

function analyzeAll() {  
  let q = [];
  fs.readdir(readDir, (err, files) => {
    files.filter((file) => {
      return fs.statSync(`${readDir}/${file}`).isFile();
    }).forEach(file => {
      let path = `${readDir}/${file}`;
      console.log(`Processing ${path}...`);
      let ws = fs.createWriteStream(`${writeDir}/${file}`);
      ws.on('open', () => {
        const rl = readline.createInterface({
          input: fs.createReadStream(path)
        }).on('line', (line) => {
          let comment = JSON.parse(line);
          q.push({
              writableStream: ws,
              comment: comment
          });
        });
      });
    });
  });

  // create a thread pump that processes a maximum of 10 requests a second
  let pump = setInterval(() => {
    let cnt = 0;
    while (q.length > 0 && cnt < 9) {
      let task = q.pop();
      cnt++;
      let comment = task.comment;
      console.log("In queue: " + q.length + "  Processing: " + cnt);
      translate.detect(comment.body, (err, result) => {
        if (err) {
          console.error(err);
        } else {
          console.log("Language: %j", result.language);
          comment.language = result.language;
          comment.confidence = result.confidence;
          task.writableStream.write(JSON.stringify(comment) + '\n');
          console.log('Comment processed.');
        }
      });
    }
  }, 1000);
}

const readline = require('readline');
const fs = require('fs');
const async = require('async');
const Language = require('@google-cloud/language');
const BigQuery = require('@google-cloud/bigquery');

const project = { 
  projectId: 'redditml',
  keyFilename: 'keys.json'
};

const language = Language(project);

const bigquery = BigQuery(project);
const dataset = bigquery.dataset('redditml');
const pTable = dataset.table('pcomments');

function analyzeAll() {
  let readDir = './data';
  let writeDir = './data/sentiment';
  
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
    while (q.length > 0 && cnt < 10) {
      let task = q.pop();
      cnt++;
      let comment = task.comment;
      console.log("In queue: " + q.length + "  Processing: " + cnt);
      language.detectSentiment(comment.body, { verbose: true }, (err, sentiment) => {
        if (err) {
          console.error(err);
        } else {
          console.log("Sentiment: %j", sentiment);
          comment.polarity = sentiment.polarity;
          comment.magnitude = sentiment.magnitude;
          task.writableStream.write(JSON.stringify(comment) + '\n');    
          console.log('Comment processed.');
        }
      });
    }
  }, 1000);
}

analyzeAll();
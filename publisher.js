const BigQuery = require('@google-cloud/bigquery');
const fs = require('fs');

const bigquery = BigQuery({
  projectId: 'redditml'
});

function importData(filePath) {
  return table.import(filePath)
    .then((results) => {
      job = results[0];
      console.log(`Job ${job.id} started.`);
      return job.promise();
    })
    .then((results) => {
      console.log(`Job ${job.id} completed.`);
      return results;
    })
    .catch((err) => {
      console.error(`Error processing json: ${err}`);
    });
}

function publishAll(dir) {
  fs.readdir(dir, (err, files) => {
    files.filter((file) => {
      return fs.statSync(`${dir}/${file}`).isFile();
    }).forEach(file => {
      let path = `${dir}/${file}`;
      console.log(`Processing ${path}...`);
      importData(path);
    });
  })
}

//Usage: node publisher ./data/translate/processed pcomments
let path = process.argv[2];
let tableName = process.argv[3];
const dataset = bigquery.dataset('redditml');
const table = dataset.table(tableName);
console.log(`Publishing data from ${path} to ${tableName}...`);
publishAll(path);

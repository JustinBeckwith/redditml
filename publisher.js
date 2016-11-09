const BigQuery = require('@google-cloud/bigquery');

const bigquery = BigQuery({
  projectId: 'redditml'
});

const dataset = bigquery.dataset('redditml');
const table = dataset.table('rawcomments');

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


var api = {
  importData: importData
}

module.exports = api;
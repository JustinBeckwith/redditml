const BigQuery = require('@google-cloud/bigquery');

let filePath = process.argv[2];

const bigquery = BigQuery({
  projectId: 'redditml'
});

const dataset = bigquery.dataset('redditml');
const table = dataset.table('rawcomments');
table.import(filePath)
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
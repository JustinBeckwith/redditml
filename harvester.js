const request = require('request');
const util = require('util');
const async = require('async');
const fs = require('fs');

// usage: node harvester listOfSubreddits.json outputDirectory pagesToRead
let subredditFilePath = process.argv[2];
let outputPath = process.argv[3]
let pagesToRead = (process.argv.length > 4) ? process.argv[4] : 4;

let subreddits = require(subredditFilePath).subreddits;
harvestAll();

function harvestAll() {
  
  async.series(
    subreddits.map((subreddit) => {
      return (callback) => {
        getComments(subreddit.name)
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

function getComments(subreddit) {
  return new Promise((resolve, reject) => {
    var subredditUrl = `https://www.reddit.com/r/${subreddit}`;
    console.log(`Processing /r/${subreddit}`);
    _getPosts(subredditUrl, (err, results) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log(`Loading comments from ${results.length} posts ...`);
        _getComments(subredditUrl, results, (err, comments) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            let filePath = `${outputPath}/${subreddit}.json`;
            const json = comments.map(JSON.stringify).join('\n');
            fs.writeFile(filePath, json, (err) => {
              if (err) {
                console.log(err);
                reject(err);
              }
              console.log(`${comments.length} comments written to ${filePath}.`);
              resolve(filePath);
            });
          }
        });
      }
    });
  });
}

function _getPosts(subredditUrl, callback) {
  console.log("Request data from reddit...");
  let allPosts = [];
  let pagesToFetch = pagesToRead;
  let fetchFns = Array(pagesToFetch);
  let fetchFn = (after, callback) => {
    console.log("Loading page: " + after);
    _populatePageUrls(subredditUrl, after, allPosts, (err, after) => {
      if (err) { 
        console.error("Error getting page urls from reddit post: " + util.inspect(err));
        return callback(err);
      }
      callback(null, after);
    });
  };
  fetchFns.fill(fetchFn);
  fetchFns[0] = async.apply(fetchFn, null);

  async.waterfall(fetchFns, (err, result) => {
    if (err) {
      console.error("Error getting reddit posts: " + util.inspect(err));
      return callback(err)
    }
    console.log('Reddit data request complete: ' + allPosts.length);
    callback(err, allPosts);
  });
}

function _populatePageUrls(subredditUrl, after, allPosts, callback) {
  console.log('populating page urls...');
  _getRedditData(subredditUrl + '/hot.json', after, (err, page) => {
            
    if (err) { 
      console.error("Error getting page of reddit posts: " + util.inspect(err));
      return callback(err);
    }
    console.log("loaded page!");
    
    var posts = page.data.children.map((post) => {
      return post.data.id;
    });
    Array.prototype.push.apply(allPosts, posts);
    callback(null, page.data.after);
  });
}

function _getRedditData(url, after, callback) {
  
  let options = {
    url: url,
    json: true,
    headers: {
      'User-Agent': 'justinbeckwith:redml:v1.0.0 (by /u/justinblat)'
    },
    qs: {
      after: after
    }
  };

  console.log(`request: ${url}`);

  request(options, (err, res, body) => {
    if (err) {
      console.error(err);
      callback(err);
    } else {
      callback(null, body);
    }
  });
}

function _getComments(subredditUrl, posts, callback) {
  let comments = [];
  let counter = 0;
  for (var i=0; i<posts.length; i++) {
    let postId = posts[i];
    let url = subredditUrl + `/comments/${postId}/top.json`;
    _getRedditData(url, null, (err, results) => {
      counter++;
      
      if (err) {
        console.error(err);
        callback(err);
      } else {
        let res = results[1];
        _populateComments(comments, res.data.children);
      }
      console.log(`${counter}/${posts.length}`);
      if (counter === posts.length) {
        callback(null, comments);
      }
    });
  }
}

function _populateComments(comments, items) {
  for (child of items) {
    if (child.data.body && child.data.subreddit) {
      comments.push({
        body: child.data.body,
        subreddit: child.data.subreddit,
        score: child.data.score,
        controversiality: child.data.controversiality
      });
    }

    if (child.data && 
        child.data.replies &&
        child.data.replies.data &&
        child.data.replies.data.children) {
      _populateComments(comments, child.data.replies.data.children);
    }
  }
}

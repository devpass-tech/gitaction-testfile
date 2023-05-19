const core = require('@actions/core');
const exec = require('@actions/exec');
const https = require('https');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const repoName = core.getInput('repo_name');
    const splittedRepoName = repoName.split('-');
    const questId = splittedRepoName[splittedRepoName.length - 1];
    const username = splittedRepoName[splittedRepoName.length - 2];
    const taskId = await getCurrentTask(questId, username);

    if(taskId){
      const testInfo = await getTaskFile(taskId);
      const fileUrl = `https://devpass-api-bucket.s3.amazonaws.com/testes/${testInfo.test_file}`;
      await downloadFile(fileUrl, testInfo.test_path);
      await exec.exec(testInfo.test_command);
    }
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getCurrentTask(questId, username) {
  const apiUrl = `http://localhost:3003/state/${username}/quest/${questId}/current-task`;
  var result;

  await axios
    .get(apiUrl)
    .then(
        function (response) {
            result = response.data
        }
    );

  return result;
}

async function getTaskFile(taskId) {
  const apiUrl = `http://localhost:3003/task/${taskId}/test-info`;
  var result;

  await axios
    .get(apiUrl)
    .then(
        function (response) {
          result = response.data
        }
    );

  return result;
}

async function downloadFile(fileUrl, fileName) {
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(fileName);
    const fileDir = path.dirname(filePath);

    fs.mkdirSync(fileDir, { recursive: true });

    const file = fs.createWriteStream(filePath);
    https.get(fileUrl, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', error => {
      fs.unlink(filePath);
      reject(error);
    });
  });
}

run();

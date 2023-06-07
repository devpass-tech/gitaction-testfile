const core = require('@actions/core');
const exec = require('@actions/exec');
const https = require('https');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const testDictionary = require('./source/testinfo.json');

async function run() {
  try {
    const repoName = core.getInput('repo_name');
    const splittedRepoName = repoName.split('-');
    const questId = splittedRepoName[splittedRepoName.length - 1];

    const branchName = core.getInput('branch_name');
    const splittedBranchName = branchName.split('/');
    const taskId = splittedBranchName[splittedBranchName.length - 2];

    const testInfo = await getTaskFile(questId, taskId);
    
    if(testInfo){
      const fileUrl = `https://devpass-api-bucket.s3.amazonaws.com/testes/${testInfo.test_file}`;
      await downloadFile(fileUrl, testInfo.test_path);
      await exec.exec(testInfo.test_command);
    }
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getTaskFile(questId, taskId) {
  var testInfo = testDictionary[questId][taskId];

  return testInfo;
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

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

    const branchName = core.getInput('branch_name');
    const testInfo = await getTaskFile(questId, branchName);
    
    if(testInfo){
      const fileUrl = `https://devpass-api-bucket.s3.amazonaws.com/testes/${testInfo.test_file}`;
      await downloadFile(fileUrl, testInfo.test_path);

      for (const command of testInfo.test_command){
        await exec.exec(command);
      }
    } else {
      core.setFailed('Test not found!');
    }
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getTaskFile(questId, branchName) {
  const testUrl = 'https://devpass-api-bucket.s3.amazonaws.com/testes/testinfo.json';
  const testFile = await getFile(testUrl);
  const testDictionary = JSON.parse(testFile);
  var testInfo = testDictionary[questId][branchName];
  return testInfo;
}

async function getFile(fileUrl) {
  return new Promise((resolve, reject) => {
    https.get(fileUrl, response => {
      let fileContent = '';

      response.on('data', data => {
        fileContent += data;
      });

      response.on('end', () => {
        resolve(fileContent);
      });
    }).on('error', error => {
      reject(error);
    });
  });
};

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

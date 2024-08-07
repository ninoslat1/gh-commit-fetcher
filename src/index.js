import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import RepositoryList from './repositoryList.js';

dotenv.config();

const app = express();
const port = 3000;
app.use(morgan('dev'));

async function fetchCommits(repo) {
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${repo}/commits`, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      throw new Error(`Rate limit exceeded. Try again after ${new Date(resetTime * 1000)}`);
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'numeric', day: 'numeric', type: 'short'};
  return new Date(dateString).toLocaleDateString('id-ID', options);
}

async function processRepositories() {
  try {
    const commitPromises = RepositoryList.map(repo => fetchCommits(repo).catch(error => {
      console.error(`Error fetching commits for ${repo}:`, error.message);
      return []; // Return empty array if fetch fails for a repo
    }));

    const allCommits = await Promise.all(commitPromises);

    allCommits.forEach((repoCommits, index) => {
      console.log(`Commits for ${RepositoryList[index]}:`);
      repoCommits.forEach(commit => {
        const commitDate = formatDate(commit.commit.author.date);
        console.info(`- [${commitDate}] ${commit.commit.message}`);
      });
      console.log('---');
    });
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  processRepositories();
});
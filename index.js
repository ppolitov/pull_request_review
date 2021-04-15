const core = require('@actions/core')
const github = require('@actions/github')

/**
 * @param {number} ms
 * @return {Promise}
 */
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  try {
    const token = core.getInput('token');

    const { payload } = github.context;
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
    const pull_number = payload.pull_request.number;
    const head = payload.pull_request.head.sha;
    const base = payload.pull_request.base.sha;
    const branch = payload.pull_request.head.ref;
    console.log(`Inputs: pull:${pull_number} owner:${owner} repo:${repo}`);

    const octokit = github.getOctokit(token);
    const { data: pulls } = await octokit.pulls.list({owner, repo});

    const response = await octokit.repos.getContent(
      {owner, repo, path: 'src/CODEOWNERS', ref: github.context.ref});
    const codeowners = Buffer.from(response.data.content, 'base64').toString();
    console.log(codeowners);

    const compare = await octokit.repos.compareCommits(
      {owner, repo, base, head});
    console.log();
    console.log('compare:', JSON.stringify(compare));

    /*
    payload.pull_request.base.ref == 'sidekick'
    payload.pull_request.head.ref == 'INFRA-3075'
    */

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()

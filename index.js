const core = require('@actions/core')
const github = require('@actions/github')

/**
 * @param {number} ms
 * @return {Promise}
 */
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Read file from a repository
 * @param {Object} context
 * @param {String} path
 * @param {String} ref
 * @returns {String} file content
 */
async function getRepoFile(context, path, ref) {
  const params = context.repo({ path });
  if (ref)
    Object.assign(params, { ref });
  const response = await context.github.repos.getContent(params);
  return Buffer.from(response.data.content, 'base64').toString();
}

async function run() {
  try {
    const branch = core.getInput('branch');
    const token = core.getInput('token');
    const slackToken = core.getInput('slack_token');

    const { payload } = github.context;
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
    console.log(`Inputs: branch:${branch} owner:${owner} repo:${repo}`);

    console.log('Context:', JSON.stringify(github.context));
    console.log('Event:', JSON.stringify(github.event));

    /*
    const pull_number = ${{ github.event.pull_request.number }}
            const owner = context.repo.owner
            const repo = context.repo.repo
          head=${{ github.event.pull_request.head.sha }}
          base=${{ github.event.pull_request.base.sha }}
    const octokit = github.getOctokit(token);
    const { data: pulls } = await octokit.pulls.list({owner, repo});
    */

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()

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
    // payload.pull_request.base.ref == 'sidekick'
    // payload.pull_request.head.ref == 'INFRA-3075'
    console.log(`Inputs: pull:${pull_number} owner:${owner} repo:${repo}`);

    const octokit = github.getOctokit(token);
    const { data: pulls } = await octokit.pulls.list({owner, repo});

    const response = await octokit.repos.getContent(
      {owner, repo, path: 'src/CODEOWNERS', ref: github.context.ref});
    const codeowners = Buffer.from(response.data.content, 'base64').toString();

    const compare = await octokit.repos.compareCommits(
      {owner, repo, base, head});

    let comments = [];
    for (let f of compare.data.files) {
      console.log(`file ${f.status}: ${f.filename}`);
      filename = f.filename.replace(/^src\//, '');
      if (f.status === 'added' && codeowners.indexOf(filename) < 0) {
        comments.push({
          path: f.filename,
          position: 0,
          body: '',
        });
      }
    }
    console.log('comments:', JSON.stringify(comments));

    if (comments.length > 0) {
      try {
        await github.pulls.createReview(
          {owner, repo, pull_number, event: 'REQUEST_CHANGES',
           comments: comments, body: ''})
      } catch (e) {
        console.error('Error when requesting review:', e)
      }
    } else {
      try {
        await github.pulls.createReview(
          {owner, repo, pull_number, event: 'APPROVE'})
      } catch (e) {
        console.error('Error when approving review:', e)
      }
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()

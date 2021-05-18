const core = require('@actions/core');
const github = require('@actions/github');
const micromatch = require('micromatch');

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
    const response = await octokit.repos.getContent(
      {owner, repo, path: 'CODEOWNERS', ref: github.context.ref});
    let codeowners = Buffer.from(response.data.content, 'base64').toString();
    if (codeowners.length > 0) {
      codeowners = codeowners.filter(line => line[0] !== '#' && line !== '')
                             .map(line => line.slice(1, line.indexOf(' ')));
    }

    const compare = await octokit.repos.compareCommits(
      {owner, repo, base, head});

    const files = compare.data.files.filter(f => f.status === 'added')
                                    .map(f => f.filename);
    console.log('Added files:', files.join('\n'));

    const missingFiles = micromatch.not(files, codeowners);

    let comments = [];
    for (let path of missingFiles) {
      comments.push({
        path,
        position: 1,
        body: 'Please add new files to CODEOWNERS',
      });
    }

    if (comments.length > 0) {
      let oldComments = []
      const { data: reviews } = await octokit.pulls.listReviews(
        {owner, repo, pull_number})
      if (reviews && reviews.length > 0) {
        await Promise.all(reviews.map(async (review) => {
          if (review && review.user.login.indexOf('github-actions') === 0) {
            const { data: cc } = await octokit.pulls.listCommentsForReview(
              {owner, repo, pull_number, review_id: review.id})
            oldComments.push(...cc)
          }
        }))
      }
      console.log('Old comments:', JSON.stringify(
        oldComments.map(({path, position, body}) => ({path, position, body}))));

      const newComments = comments.filter(comment =>
        !oldComments.some(old =>
          old.position === comment.position &&
          old.path === comment.path &&
          old.body === comment.body))

      console.log('New comments:', JSON.stringify(newComments));

      if (newComments.length > 0) {
        try {
          await octokit.pulls.createReview(
            {owner, repo, pull_number, event: 'REQUEST_CHANGES',
             comments: comments, body: ''})
        } catch (e) {
          console.error('Error when requesting review:', e)
        }
      }
    } else {
      try {
        await octokit.pulls.createReview(
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

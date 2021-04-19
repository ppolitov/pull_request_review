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
    const response = await octokit.repos.getContent(
      {owner, repo, path: 'CODEOWNERS', ref: github.context.ref});
    const codeowners = Buffer.from(response.data.content, 'base64').toString();

    const compare = await octokit.repos.compareCommits(
      {owner, repo, base, head});

    let comments = [];
    for (let f of compare.data.files) {
      console.log(`file ${f.status}: ${f.filename}`);
      if (f.status === 'added' && codeowners.indexOf(f.filename) < 0) {
        comments.push({
          path: f.filename,
          position: 1,
          body: 'Please add new files to CODEOWNERS',
        });
      }
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

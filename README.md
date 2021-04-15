Installation:

      - name: Checkout
        uses: actions/checkout@v2
        with:
          repository: ppolitov/pull_request_review
          path: actions/pr_review

      - name: Node Modules
        shell: bash
        working-directory: actions/pr_review
        run: |
          npm install

      - name: Pull Request Review
        uses: ./actions/pr_review
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

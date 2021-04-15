Installation:
      - name: Checkout
        uses: actions/checkout@v2
        with:
          repository: ppolitov/pull_requests_action
          path: actions/pulls

      - name: Node Modules
        shell: bash
        working-directory: actions/pulls
        run: |
          npm install

      - name: Check Pull Requests
        uses: ./actions/pulls
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

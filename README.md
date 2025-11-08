# Editor for write blog technology and programming

## Option 1: Use editor for write blog. (Recommended)


![Alt text](./screenshot.png)

```
yarn dev
```

It will show list post, click on post to edit, have button "New post" to create new post, have button "Publish" to publish post to GitHub.



## Option 2: How to Deploy a Jekyll Blog on GitHub Pages (default)

### Step 1: Install Jekyll and Bundler
First, ensure you have Ruby and Bundler installed. Then, install Jekyll and Bundler gems:

```
gem install jekyll bundler
```

### Step 2: Create a New Jekyll Site
Create a new Jekyll site in a directory of your choice:

```
jekyll new my-blog
cd my-blog
```

### Step 3: Build the Site and Serve Locally
Build the site and make it available on a local server:

```
bundle exec jekyll serve
```

Visit http://localhost:4000 to see your site.

### Step 4: Prepare for Deployment
Add the github-pages gem to your Gemfile:

```
gem "github-pages", group: :jekyll_plugins
```

Run bundle install to install the gem.

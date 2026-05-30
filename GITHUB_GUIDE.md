# Step-by-Step GitHub Deployment Guide

This guide will walk you through the process of committing your local chess app changes, pushing them to your GitHub repository, and making sure the live site updates properly on **GitHub Pages**.

---

## Part 1: Connect Your Local Project to GitHub

If you have already initialized Git in your project folder, you can skip to **Part 2**. Otherwise, follow these setup steps:

### Step 1: Open Terminal in Project Directory
Open **PowerShell** or **Git Bash** in your project folder:
```powershell
d:
cd d:\chess-master-app-main
```

### Step 2: Initialize Git Repository
Run the following commands to initialize Git locally:
```bash
git init
```

### Step 3: Configure Your Git Identity (One-Time Setup)
Make sure Git knows who you are so your commits are attributed correctly:
```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

### Step 4: Link Your Local Folder to GitHub
If you haven't linked your local repository to GitHub yet:
```bash
git remote add origin https://github.com/aum-patel14/chess-master-app.git
```
*(If it already exists, you can verify it with `git remote -v`)*.

---

## Part 2: Commit Your Changes Locally

Now that Git is linked, you can save your local rebuild changes.

### Step 1: Check Current Status
See which files have been modified or added:
```bash
git status
```

### Step 2: Stage All Modified Files
Add all changes to the staging environment, preparing them for a commit:
```bash
git add .
```

### Step 3: Create a Save Commit
Commit the staged files with a descriptive message outlining the ChessMaster Pro Rebuild:
```bash
git commit -m "feat: complete rebuild of ChessMaster Pro (Stockfish AI, board scaling, clocks, puzzle page, upgrade flow, and SVG game analysis)"
```

---

## Part 3: Push Changes to GitHub

### Step 1: Create or Target the Main Branch
Make sure your primary branch is named `main` (modern default):
```bash
git checkout -b main
```
*(If the branch already exists, switch to it with `git checkout main`)*.

### Step 2: Push to GitHub Remote
Push the local commit files to your online repository:
```bash
git push -u origin main
```
*Note: If you get a permission or authentication error, see the **Authentication Troubleshooting** section below.*

---

## Part 4: Updating the Live GitHub Pages Site

Since your project is built with React/Vite, it needs to be compiled before it can run on the browser. You have two common ways to handle this on GitHub Pages:

### Option A: Automatic Deployment using GitHub Actions (Recommended)
This is the cleanest modern way. GitHub will compile the project automatically every time you push changes to the `main` branch.

1. **Create the Workflow File**: Make a folder named `.github/workflows/` and create a file inside named `deploy.yml` with these contents:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches:
         - main

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: "pages"
     cancel-in-progress: true

   jobs:
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
         - name: Set up Node
           uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: npm
         - name: Install dependencies
           run: npm ci
         - name: Build
           run: npm run build
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: ./dist
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```
2. **Enable Actions in GitHub Settings**:
   - Go to your repository on github.com.
   - Click **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, select **GitHub Actions**.
   - Push your changes to the `main` branch, and GitHub will deploy the site automatically!

---

### Option B: Manual deployment using the `gh-pages` npm package
If you prefer to compile and deploy manually from your command line:

1. **Install the deploy tool**:
   ```bash
   npm install gh-pages --save-dev
   ```
2. **Add Deploy Scripts in `package.json`**:
   Add these lines under your `"scripts"` block in `package.json`:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
3. **Run the deployment**:
   ```bash
   npm run deploy
   ```
   *This compiles your code, pushes the built files to a separate `gh-pages` branch, and updates your live site!*

---

## Troubleshooting Git Authentication on Windows

If Git prompts you for authentication during `git push`:

1. **GitHub Personal Access Token (PAT)**:
   - Go to **github.com** -> Click your Avatar -> **Settings** -> **Developer Settings** -> **Personal Access Tokens** -> **Tokens (classic)**.
   - Click **Generate new token**. Select `repo` permissions and copy the token.
   - When the terminal asks for your GitHub password, **paste the Token** instead of your regular password.
   
2. **Using GitHub CLI (Simplest)**:
   - Install GitHub CLI by running: `winget install --id GitHub.cli`
   - Restart your terminal, then run: `gh auth login`
   - Choose `GitHub.com`, choose `HTTPS`, and authenticate directly through your browser. Once done, all your `git push` commands will authenticate automatically!

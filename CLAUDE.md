# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

- **Commit and push everything to GitHub.** The user wants all changes in this directory tracked on GitHub. After making changes, stage them, create a commit with a clear message, and push to the GitHub remote. This is a standing authorization — you do not need to ask before each commit/push in this directory.
  - If the directory is not yet a git repo, initialize one (`git init`) and ask the user for the GitHub remote URL before the first push.
  - Still skip files that look sensitive (`.env`, credentials, keys) and warn the user instead of committing them.
  - Never force-push to `main`/`master`.

## Codebase

The directory is currently empty — no code to document yet. Update this section as the project takes shape.
